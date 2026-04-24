$ErrorActionPreference = "Stop"

$BASE = "http://localhost:8080/api/v1"

Write-Host "========================================="
Write-Host " Iniciando Teste E2E (T01 ao T05)"
Write-Host "========================================="

# 1. Login
Write-Host "`n[1] Realizando Login..."
$loginBody = '{"email":"admin@ecoinventario.com","password":"SenhaForte123"}'
$loginResp = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$TOKEN = $loginResp.access_token
$Headers = @{ Authorization = "Bearer $TOKEN" }
Write-Host "[OK] Login OK. Token obtido"

# 2. Obter Asset Type (Busca o primeiro existente)
Write-Host "`n[2] Buscando Asset Type..."
$atList = Invoke-RestMethod -Uri "$BASE/asset-types" -Headers $Headers
$TYPE_ID = $atList.data[0].id
Write-Host "[OK] Usando Asset Type: $TYPE_ID"

# 3. Criar Asset
Write-Host "`n[3] Criando Asset (Draft)..."
$qrCode = "https://app.ecoinventario.com/a/" + [guid]::NewGuid().ToString().Substring(0,8)
$assetBody = '{"asset_type_id":"' + $TYPE_ID + '","latitude":-23.5505,"longitude":-46.6333,"gps_accuracy_m":4.5,"qr_code":"' + $qrCode + '","notes":"Criado pelo script E2E"}'
$assetResp = Invoke-RestMethod -Uri "$BASE/assets" -Method POST -Headers $Headers -ContentType "application/json" -Body $assetBody
$ASSET_ID = $assetResp.id
Write-Host "[OK] Asset Criado: $ASSET_ID (Status: $($assetResp.status))"

# 4. Solicitar Upload URL
Write-Host "`n[4] Solicitando URL de Upload (S3/MinIO)..."
$idemKey = [guid]::NewGuid().ToString()
$uploadBody = '{"asset_id":"' + $ASSET_ID + '","media_type":"general","mime_type":"image/jpeg","size_bytes":1024,"idempotency_key":"' + $idemKey + '"}'
$uploadResp = Invoke-RestMethod -Uri "$BASE/media/upload-url" -Method POST -Headers $Headers -ContentType "application/json" -Body $uploadBody
$MEDIA_ID = $uploadResp.media_id
$UPLOAD_URL = $uploadResp.upload_url
Write-Host "[OK] Upload URL gerada para Media ID: $MEDIA_ID"

# 5. Fazer Upload para o S3
Write-Host "`n[5] Simulando upload binario para o MinIO..."
$bytes = [byte[]](1..255)
[IO.File]::WriteAllBytes("test_e2e_image.jpg", $bytes)
Invoke-RestMethod -Uri $UPLOAD_URL -Method PUT -ContentType "image/jpeg" -InFile "test_e2e_image.jpg"
Write-Host "[OK] Arquivo enviado com sucesso para o bucket!"

# 6. Confirmar Upload no Backend
Write-Host "`n[6] Confirmando upload com o backend..."
$confResp = Invoke-RestMethod -Uri "$BASE/media/$MEDIA_ID/confirm" -Method POST -Headers $Headers
Write-Host "[OK] Media Status: $($confResp.upload_status)"

# 7. Obter a URL de Leitura
Write-Host "`n[7] Resgatando URL de acesso assinada..."
$getResp = Invoke-RestMethod -Uri "$BASE/media/$MEDIA_ID" -Headers $Headers
Write-Host "[OK] URL Segura obtida: $($getResp.url.Substring(0, 50))... (expira em 1h)"

# 8. Submit do Asset
Write-Host "`n[8] Submetendo Asset para aprovacao..."
$subResp = Invoke-RestMethod -Uri "$BASE/assets/$ASSET_ID/submit" -Method POST -Headers $Headers
Write-Host "[OK] Asset Status atualizado para: $($subResp.status)"

# 9. Aprovar o Asset
Write-Host "`n[9] Aprovando o Asset..."
$apprResp = Invoke-RestMethod -Uri "$BASE/assets/$ASSET_ID/approve" -Method POST -Headers $Headers
Write-Host "[OK] Asset Status atualizado para: $($apprResp.status)"

# Limpeza
Remove-Item -Path "test_e2e_image.jpg" -ErrorAction SilentlyContinue

Write-Host "`n========================================="
Write-Host " Teste Concluido com Sucesso!"
Write-Host "========================================="
