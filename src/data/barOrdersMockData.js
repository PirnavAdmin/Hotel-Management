export const BAR_ORDERS = [
  { id: "BO-2048", table: "B01 · Dine-in", customer: "Nikhil R.", items: "2 × Oak Reserve Peg, 2 × Tonic Water", quantity: 4, time: "Today, 8:42 PM", subtotal: 1040, discount: 0, gst: 52, service: 52, total: 1144, payment: "Paid", status: "Preparing" },
  { id: "BO-2047", table: "L01 · Dine-in", customer: "Walk-in Guest", items: "2 × Citrus Gin Fizz, 1 × Kingfisher", quantity: 3, time: "Today, 8:31 PM", subtotal: 1000, discount: 50, gst: 47.5, service: 47.5, total: 1045, payment: "Pending", status: "Ready" },
  { id: "BO-2046", table: "O01 · Dine-in", customer: "Ananya K.", items: "3 × Classic Mojito, 2 × Mineral Water", quantity: 5, time: "Today, 8:10 PM", subtotal: 1240, discount: 0, gst: 62, service: 62, total: 1364, payment: "Paid", status: "Served" },
  { id: "BO-2045", table: "Takeaway", customer: "Pickup Guest", items: "1 × Sparkling Rosé, 2 × Fresh Orange Juice", quantity: 3, time: "Today, 7:56 PM", subtotal: 870, discount: 0, gst: 43.5, service: 0, total: 913.5, payment: "Pending", status: "Pending" },
  { id: "BO-2044", table: "B02 · Dine-in", customer: "Rahul S.", items: "2 × Kingfisher Premium", quantity: 2, time: "Today, 7:40 PM", subtotal: 440, discount: 0, gst: 22, service: 22, total: 484, payment: "Paid", status: "Cancelled" },
  { id: "BO-2043", table: "L02 · Dine-in", customer: "Walk-in Guest", items: "2 × Garden Cooler, 1 × Tonic Water", quantity: 3, time: "Today, 7:22 PM", subtotal: 490, discount: 0, gst: 24.5, service: 24.5, total: 539, payment: "Paid", status: "Served" },
  { id: "BO-2042", table: "I01 · Dine-in", customer: "Megha P.", items: "1 × Dark Rum Peg", quantity: 1, time: "Today, 7:05 PM", subtotal: 300, discount: 0, gst: 15, service: 15, total: 330, payment: "Pending", status: "Preparing" },
];

// Bar Orders / Bills UI examples only. Shared API orders remain the primary list;
// these records are shown only when the shared orders API is unavailable.
export const BAR_BILL_DEMO_ORDERS = [
  { id: "ORD-1001", table: "Table-4", customer: "Ananya K.", time: "Today, 7:42 PM", status: "Preparing", items: [
    { name: "Chicken Biryani", category: "Food", quantity: 2, unitPrice: 250 },
    { name: "Paneer Butter Masala", category: "Food", quantity: 1, unitPrice: 220 },
    { name: "Red Wine", category: "Beverage", quantity: 1, unitPrice: 450 },
    { name: "Fresh Lime Soda", category: "Beverage", quantity: 2, unitPrice: 80 },
  ] },
  { id: "ORD-1002", table: "Table-2", customer: "Rahul S.", time: "Today, 7:25 PM", status: "Ready", items: [
    { name: "Tandoori Chicken", category: "Food", quantity: 1, unitPrice: 380 },
    { name: "Kingfisher Beer", category: "Beverage", quantity: 2, unitPrice: 220 },
    { name: "Classic Mojito Mocktail", category: "Beverage", quantity: 1, unitPrice: 180 },
  ] },
  { id: "ORD-1003", table: "Table-8", customer: "Walk-in Guest", time: "Today, 6:58 PM", status: "Served", items: [
    { name: "Gongura Mutton", category: "Food", quantity: 1, unitPrice: 420 },
    { name: "Crispy Corn", category: "Food", quantity: 2, unitPrice: 160 },
    { name: "Sparkling Water", category: "Beverage", quantity: 2, unitPrice: 90 },
  ] },
  { id: "ORD-1004-VERY-LONG-REFERENCE-2026-004", table: "Table-12", customer: "Megha P.", time: "Today, 6:34 PM", status: "Pending", items: [
    { name: "Veg Hakka Noodles", category: "Food", quantity: 2, unitPrice: 210 },
    { name: "Craft Beer", category: "Beverage", quantity: 1, unitPrice: 280 },
    { name: "Mango Passion Mocktail", category: "Beverage", quantity: 2, unitPrice: 190 },
    { name: "Cola", category: "Beverage", quantity: 2, unitPrice: 60 },
  ] },
];

export const BAR_KOTS = [
  { id: "BKOT-781", orderId: "BO-2048", table: "B01 · Dine-in", time: "8:42 PM", received: "8:42 PM", preparing: "8:44 PM", ready: "—", items: [{ name: "Oak Reserve Peg", quantity: 2, notes: "One with ice" }, { name: "Tonic Water", quantity: 2, notes: "Chilled" }], status: "Preparing" },
  { id: "BKOT-780", orderId: "BO-2047", table: "L01 · Dine-in", time: "8:31 PM", received: "8:31 PM", preparing: "8:33 PM", ready: "8:39 PM", items: [{ name: "Citrus Gin Fizz", quantity: 2, notes: "Less ice" }, { name: "Kingfisher Premium", quantity: 1, notes: "Very cold" }], status: "Ready" },
  { id: "BKOT-779", orderId: "BO-2045", table: "Takeaway", time: "7:56 PM", received: "7:56 PM", preparing: "—", ready: "—", items: [{ name: "Sparkling Rosé", quantity: 1, notes: "Keep sealed" }, { name: "Fresh Orange Juice", quantity: 2, notes: "No ice" }], status: "Received" },
];
