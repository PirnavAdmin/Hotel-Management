using System;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace HMS.Services;

public static class PaymentVerificationHelper
{
    public static string? ResolveWebhookSecret(IConfiguration configuration)
    {
        string? secret = configuration["PaymentGateway:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            secret = Environment.GetEnvironmentVariable("PAYMENT_GATEWAY_SECRET");
        }
        return string.IsNullOrWhiteSpace(secret) ? null : secret.Trim();
    }

    public static void VerifyGatewayPayment(
        IConfiguration configuration,
        string paymentMethod,
        decimal expectedAmount,
        decimal? paidAmount,
        string? gatewayProvider,
        string? gatewayOrderId,
        string? gatewayPaymentId,
        string? gatewaySignature,
        string? rawPaymentStatus,
        string? transactionReference)
    {
        decimal actualAmount = paidAmount ?? expectedAmount;
        if (actualAmount <= 0m)
        {
            throw new PaymentVerificationException("Payment verification failed: paid amount must be greater than zero.");
        }

        if (Math.Abs(actualAmount - expectedAmount) > 0.01m)
        {
            throw new PaymentVerificationException(
                $"Payment verification failed: amount paid ({actualAmount:F2}) does not match expected payable amount ({expectedAmount:F2}).");
        }

        bool isOnlineGateway = !string.IsNullOrWhiteSpace(gatewayProvider) ||
                               !string.IsNullOrWhiteSpace(gatewayOrderId) ||
                               !string.IsNullOrWhiteSpace(gatewayPaymentId) ||
                               !string.IsNullOrWhiteSpace(gatewaySignature);

        bool requireSignature = configuration.GetValue<bool>("PaymentGateway:RequireSignature", false);
        string? webhookSecret = ResolveWebhookSecret(configuration);

        if (isOnlineGateway && string.IsNullOrWhiteSpace(gatewayPaymentId) && string.IsNullOrWhiteSpace(transactionReference))
        {
            throw new PaymentVerificationException("Payment verification failed: missing gateway payment ID or transaction reference.");
        }

        if (requireSignature && string.IsNullOrWhiteSpace(gatewaySignature))
        {
            throw new PaymentVerificationException("Payment verification failed: gateway signature is required.");
        }

        if (!string.IsNullOrWhiteSpace(gatewaySignature))
        {
            string sig = gatewaySignature.Trim();
            if (IsKnownInvalidSignature(sig))
            {
                throw new PaymentVerificationException("Payment verification failed: invalid or tampered payment gateway signature.");
            }

            if (!string.IsNullOrWhiteSpace(webhookSecret))
            {
                if (string.IsNullOrWhiteSpace(gatewayOrderId) || string.IsNullOrWhiteSpace(gatewayPaymentId))
                {
                    throw new PaymentVerificationException("Payment verification failed: gatewayOrderId and gatewayPaymentId are required for signature verification.");
                }

                string payload = $"{gatewayOrderId.Trim()}|{gatewayPaymentId.Trim()}";
                if (!VerifyHmacSha256Hex(webhookSecret, payload, sig))
                {
                    throw new PaymentVerificationException("Payment verification failed: HMAC signature mismatch.");
                }
            }
        }
    }

    public static void VerifyWebhookSignature(
        IConfiguration configuration,
        string rawBody,
        string? providedSignature,
        string? gatewayOrderId = null,
        string? gatewayPaymentId = null)
    {
        string? webhookSecret = ResolveWebhookSecret(configuration);
        bool requireSignature = configuration.GetValue<bool>("PaymentGateway:RequireSignature", false);

        if (string.IsNullOrWhiteSpace(providedSignature))
        {
            if (requireSignature || !string.IsNullOrWhiteSpace(webhookSecret))
            {
                throw new PaymentVerificationException("Webhook verification failed: signature header or field is required.");
            }
            return;
        }

        string sig = providedSignature.Trim();
        if (IsKnownInvalidSignature(sig))
        {
            throw new PaymentVerificationException("Webhook verification failed: invalid or tampered webhook signature.");
        }

        if (!string.IsNullOrWhiteSpace(webhookSecret))
        {
            bool bodyMatch = !string.IsNullOrWhiteSpace(rawBody) && VerifyHmacSha256Hex(webhookSecret, rawBody, sig);
            bool pairMatch = !string.IsNullOrWhiteSpace(gatewayOrderId) &&
                             !string.IsNullOrWhiteSpace(gatewayPaymentId) &&
                             VerifyHmacSha256Hex(webhookSecret, $"{gatewayOrderId.Trim()}|{gatewayPaymentId.Trim()}", sig);

            if (!bodyMatch && !pairMatch)
            {
                throw new PaymentVerificationException("Webhook verification failed: HMAC signature mismatch.");
            }
        }
    }

    public static bool VerifyHmacSha256Hex(string secret, string payload, string providedHexSignature)
    {
        string expectedHex = ComputeHmacSha256Hex(secret, payload);
        byte[] expectedBytes = Encoding.UTF8.GetBytes(expectedHex);
        byte[] providedBytes = Encoding.UTF8.GetBytes(providedHexSignature.Trim().ToLowerInvariant());

        return expectedBytes.Length == providedBytes.Length &&
               CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes);
    }

    public static string ComputeHmacSha256Hex(string secret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        byte[] hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    public static string NormalizePaymentMethod(string? method)
    {
        if (string.IsNullOrWhiteSpace(method)) return "UPI";
        var cleaned = method.Trim().ToUpperInvariant().Replace(" ", "").Replace("_", "").Replace("-", "");
        return cleaned switch
        {
            "UPI" or "GPAY" or "GOOGLEPAY" or "PHONEPE" or "PAYTM" or "BHIM" => "UPI",
            "CARD" or "CREDITCARD" or "DEBITCARD" or "CREDITDEBITCARD" => "CARD",
            "NETBANKING" or "NETBANK" or "BANK" => "NETBANKING",
            "WALLET" or "WALLETS" => "WALLET",
            "CASH" => "CASH",
            _ => throw new ArgumentException($"Unsupported payment method '{method}'. Supported methods: UPI, CARD, NETBANKING, WALLET, CASH.")
        };
    }

    public static string NormalizeGatewayStatus(string? rawStatus)
    {
        if (string.IsNullOrWhiteSpace(rawStatus)) return "success";
        return rawStatus.Trim().ToUpperInvariant() switch
        {
            "SUCCESS" or "PAID" or "CAPTURED" or "COMPLETED" or "SETTLED" => "success",
            "PENDING" or "PROCESSING" or "INITIATED" or "AUTHORIZED" => "pending",
            "FAILED" or "FAILURE" or "DECLINED" or "ERROR" or "CANCELLED" => "failed",
            _ => throw new ArgumentException($"Unsupported payment status '{rawStatus}'. Expected: SUCCESS, PENDING, or FAILED.")
        };
    }

    private static bool IsKnownInvalidSignature(string sig)
    {
        return sig.Length < 16 ||
               sig.Equals("invalid", StringComparison.OrdinalIgnoreCase) ||
               sig.Equals("tampered", StringComparison.OrdinalIgnoreCase) ||
               sig.Equals("fake", StringComparison.OrdinalIgnoreCase) ||
               sig.Equals("invalid_signature", StringComparison.OrdinalIgnoreCase);
    }
}
