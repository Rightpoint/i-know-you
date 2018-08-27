# I Know You - Web
This is the front-end application for the I Know You computer vision POC.

## Deployment
This is a static site that is served from [Azure Storage](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website).

One-time setup for Azure CLI
```
az extension add --name storage-preview
```

Run this to create a new static web endpoint
```
az login

az account set --subscription 7be00436-d440-4bad-a568-e4366966067f

az group create -l northcentralus -n i-know-you
az storage account create -n iknowyouwebdev -g i-know-you -l northcentralus --kind StorageV2 --sku Standard_RAGRS

az storage blob service-properties update --account-name iknowyouwebdev --static-website --404-document 404.html --index-document index.html

az storage account show -n iknowyouwebdev -g i-know-you --query "primaryEndpoints.web" --output tsv
```

Deploy to web endpoint
```
az storage blob upload-batch -s deploy -d $web --account-name iknowyouwebdev
```