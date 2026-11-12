FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY HMS.csproj ./
RUN dotnet restore HMS.csproj
COPY . ./
RUN dotnet publish HMS.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000
COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "HMS.dll"]
