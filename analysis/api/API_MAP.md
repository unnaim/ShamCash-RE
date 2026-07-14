# ShamCash 2.2.6 API Map

Reconstructed from `libapp.so` (Dart AOT snapshot) via Blutter string/object-pool analysis.
App is **Flutter + Dart, built with `--obfuscate`** → symbol names are stripped, but all
string literals (URLs, endpoint paths, JSON keys, headers) survive in cleartext.

## Backend hosts (base = `https://<host>/v4/api/`)
- `api.shamcash.sy`   (primary)
- `api-02.shamcash.sy` (failover/mirror)
- `api-03.shamcash.sy` (failover/mirror)
- `bank.shamcash.sy`   (banking / CIF operations)
- `payment.shamcash.sy` (payments)
- `shamcash.sy`: marketing site, `/en/accountUpgrade`, deep link `/payment`
- `app.chatwoot.com`: in-app customer support chat (`/public/api/v1/inboxes/...`)
- `t.me/shamcashapp`: Telegram

## Auth / headers (observed string constants)
- `Authorization: Bearer <token>`
- `accessToken`, `token`, `refresh`/`Refresh`: token + refresh-token flow
- `apiKey`
- `deviceId`: device binding (see `Account/AddDeviceKey`)
- `lang`, `Accept-Language`: i18n (Arabic/English)
- `User-Agent`, `Content-Type`, `Accept`
- Crypto-adjacent strings: `publicKey`, `IV`, `securityCode`, `otp`
  → consistent with `librsa_bridge.so` (RSA) doing key exchange / request or PIN encryption.

## Endpoints (137) by controller

### Authentication
- Authentication/signin
- Authentication/verify
- Authentication/check2fa
- Authentication/checkKYC
- Authentication/resetOtpCode
- Authentication/changePhoneNumber
- Authentication/changeSecurityCode
- Authentication/logout/new

### Session
- Session/create
- Session/check
- Session/getAllSessions
- Session/logout
- Session/delete/{id}

### ForgotPassword / ResetPassword
- ForgotPassword/GenerateOtp
- ForgotPassword/CheckOtp
- ForgotPassword/ChangePassword
- ResetPassword/checkEmailOrPhone
- ResetPassword/checkOtp
- ResetPassword/addNewPassword

### Account
- Account/balances
- Account/settings
- Account/changePassword
- Account/changeLanguage
- Account/updateCurrencySetting
- Account/editContact
- Account/verifyEditContact
- Account/getAccountByAddress
- Account/AddDeviceKey

### AccountFavorites
- AccountFavorites/all
- AccountFavorites/new
- AccountFavorites/delete

### PersonalAccount
- PersonalAccount/get
- PersonalAccount/new/v2
- PersonalAccount/update/v2
- PersonalAccount/GetPersonalCodeTables
- PersonalAccount/verifyIdentity
- PersonalAccount/verifyIdentityCheck

### CommercialAccount(s)
- CommercialAccount/GetCodeTable
- CommercialAccounts/getProfile
- CommercialAccounts/new
- CommercialAccounts/update

### GovernmentAccount
- GovernmentAccount/getProfile
- GovernmentAccount/new
- GovernmentAccount/update

### OrganizationAccount
- OrganizationAccount/GetCodeTable
- OrganizationAccount/getProfile
- OrganizationAccount/new
- OrganizationAccount/update

### ManageSubAccount / SubAccount
- ManageSubAccount/new
- ManageSubAccount/update
- ManageSubAccount/close
- ManageSubAccount/delete
- ManageSubAccount/checkRequest
- ManageSubAccount/getOwnerInfo
- ManageSubAccount/getSubAccountByOwner
- ManageSubAccount/getTransactionLogs
- ManageSubAccount/settleSubAccountByOwner
- ManageSubAccount/upgradeAccount
- SubAccount/getSubAccountBalances
- SubAccount/getSubAccountSettings
- SubAccount/updateSubAccountSettings
- SubAccount/getTransactionLogs

### Transaction / Exchange (money movement)
- Transaction/new
- Transaction/logs
- Transaction/history-logs
- Exchange/createTransactionToSomeone
- Exchange/createCashInRequest
- Exchange/cancelCashInRequest
- Exchange/getServices
- Exchange/generalInfo
- Exchange/Log

### Banks (CIF / cash operations)
- Banks/getBanks
- Banks/getAccounts
- Banks/getCifs
- Banks/addCif
- Banks/confirmCif
- Banks/cashDeposit
- Banks/cashWithdraw
- Banks/confirmWithdraw
- Banks/cashTransfer
- Banks/getCommission
- Banks/log

### ThirdParty (merchant/third-party payment requests)
- ThirdParty/new
- ThirdParty/pendingTransaction
- ThirdParty/pendingTransactionByThirdParty
- ThirdParty/approvedRequests
- ThirdParty/changeTransactionStatus
- ThirdParty/cancelThirdParty

### Billing / ElectronicPayment
- Billing/getBillingFields
- Billing/presentment
- Billing/pay
- Billing/log
- ElectronicPayment/getBill
- ElectronicPayment/pay

### MtnWallet (MTN Syria telecom wallet)
- MtnWallet/create
- MtnWallet/check
- MtnWallet/all
- MtnWallet/cashIn
- MtnWallet/cashOut
- MtnWallet/confirmCashOut
- MtnWallet/calculatePaidAmount
- MtnWallet/chargePostPaid
- MtnWallet/dynamicRecharge
- MtnWallet/GetBundles
- MtnWallet/ActiveBundles
- MtnWallet/log

### SyriatelWallet (Syriatel telecom wallet)
- SyriatelWallet/create
- SyriatelWallet/check
- SyriatelWallet/all
- SyriatelWallet/cashIn
- SyriatelWallet/calculatePaidAmount
- SyriatelWallet/chargePostPaid
- SyriatelWallet/dynamicRecharge
- SyriatelWallet/log

### EducationService
- EducationService/All
- EducationService/presentment
- EducationService/Payment/new

### Service (GreenEnergy + containers)
- Service/GreenEnergy/All
- Service/GreenEnergy/FeesAndDebts
- Service/GreenEnergy/Pay
- Service/GreenEnergy/PayByType
- Service/Containers
- Service/Containers/{id}

### ServiceNumber
- ServiceNumber/all
- ServiceNumber/create
- ServiceNumber/update
- ServiceNumber/delete/{id}

### ProfileService
- ProfileService/UpdateName/{id}
- ProfileService/Delete/{id}

### Notification
- Notification/getAll
- Notification/getAllSubNotifications
- Notification/delete
- Notification/deleteSubNotif

### Misc
- Governorate/all
- Static/policy
- Static/support
- Static/version/new   (force-update check)

## Artifacts (published)
- `analysis/api/endpoints_final.txt`: flat list of endpoints

Additional raw artifacts (the full Dart object pool, the reconstructed asm, and the extracted
string table) were produced during analysis but are **not redistributed** here. They are bulk
extracts of the copyrighted application binary.
