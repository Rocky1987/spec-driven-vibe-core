# 方式 A：零安裝重現。多階段：build（SDK + Node，供 test / verify 使用）→ web（僅執行階段）。
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node
WORKDIR /src
COPY . .
RUN dotnet publish src/FlashSale.Web -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS web
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "FlashSale.Web.dll"]
