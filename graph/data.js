/* ShamCash 2.2.6 — reverse-engineered API model (data layer)
 * Source: static RE of libapp.so (Flutter/Dart AOT) + assets + native libs.
 * NOTE: HTTP methods and per-endpoint host/auth are INFERRED from naming + observed flow;
 *       server-side enforcement was NOT verified. Descriptions are derived from endpoint names.
 */
window.GRAPH_META = {
  app: "ShamCash", version: "2.2.6 (build 30)", pkg: "com.shmacash.shamcash",
  stack: "Flutter (Dart AOT, obfuscated) · Firebase FCM · ML Kit QR",
  hosts: ["api.shamcash.sy", "api-02.shamcash.sy", "api-03.shamcash.sy",
          "bank.shamcash.sy", "payment.shamcash.sy"],
  base: "/v4/api/",
  auth: "Authorization: Bearer <accessToken> (+ refresh) · headers: apiKey, deviceId, lang",
  crypto: "fast_rsa (Go librsa_bridge.so) RSA PKCS1v15 w/ bundled 2048-bit key; AES-GCM local; " +
          "sensitive fields (securityCode) RSA-encrypted → base64",
  note: "Methods/hosts/auth are inferred from RE, not confirmed against the server."
};

// Domains = top-level clusters (colour groups)
window.DOMAINS = {
  auth:     { label: "Auth & Session",     color: "#e06c75" },
  accounts: { label: "Accounts & Profile", color: "#5a9fd4" },
  money:    { label: "Money Movement",     color: "#6cbf84" },
  telecom:  { label: "Telecom Wallets",    color: "#a184c9" },
  services: { label: "Bills & Services",   color: "#4aa5b3" },
  platform: { label: "Platform & Meta",    color: "#9aa4b0" },
};

// Data models / domain entities (hub nodes)
window.MODELS = [
  { id: "m_identity",  label: "Identity / KYC",        desc: "User identity, phone, security code (PIN), 2FA, KYC/national-ID verification." },
  { id: "m_session",   label: "Session / Device",      desc: "Login sessions, access/refresh tokens, device binding (AddDeviceKey / deviceId)." },
  { id: "m_account",   label: "Account / Profile",     desc: "Account profiles (personal, commercial, government, organization), contacts, favourites, settings." },
  { id: "m_balance",   label: "Wallet Balance",        desc: "The user's monetary balance(s) per currency — debited/credited by every money-movement flow." },
  { id: "m_subaccount",label: "Sub-Account",           desc: "Child wallets owned/managed by a primary account; balances, settings, settlement." },
  { id: "m_ledger",    label: "Transaction Ledger",    desc: "Transaction records & logs produced by transfers, cash ops, bill payments, telecom." },
  { id: "m_bank",      label: "Bank / CIF",            desc: "Linked bank customer identities (CIF) and bank cash deposit/withdraw/transfer rails." },
  { id: "m_telecom",   label: "Telecom Wallet",        desc: "MTN & Syriatel mobile-money wallets bridged to the ShamCash balance." },
  { id: "m_biller",    label: "Biller / Service Catalog", desc: "Billers & payable services: utilities, electronic payment, education, green energy." },
  { id: "m_notif",     label: "Notification",          desc: "Push/in-app notifications (Firebase FCM) and sub-account notifications." },
  { id: "m_ref",       label: "Reference Data",        desc: "Static/reference data: governorates, code tables, policy, version/force-update." },
];

// Services (controllers) -> domain, linked models, host, description
window.SERVICES = {
  Authentication:      { domain: "auth",     models: ["m_identity","m_session"], host: "api", desc: "Sign-in, OTP verification, 2FA, KYC check, credential/phone changes, logout." },
  Session:             { domain: "auth",     models: ["m_session"],              host: "api", desc: "Session lifecycle: create/check/list/delete, multi-device session management." },
  ForgotPassword:      { domain: "auth",     models: ["m_identity"],             host: "api", desc: "Forgot-password OTP flow: generate OTP → check OTP → change password." },
  ResetPassword:       { domain: "auth",     models: ["m_identity"],             host: "api", desc: "Reset-password flow via email/phone + OTP → set new password." },
  Account:             { domain: "accounts", models: ["m_account","m_balance","m_session"], host: "api", desc: "Core account: balances, settings, language/currency, contacts, device key, address lookup." },
  AccountFavorites:    { domain: "accounts", models: ["m_account"],              host: "api", desc: "Saved payees / favourite accounts: list, add, delete." },
  PersonalAccount:     { domain: "accounts", models: ["m_account","m_identity","m_ref"], host: "api", desc: "Personal account onboarding/update (v2) + identity verification (KYC) + code tables." },
  CommercialAccount:   { domain: "accounts", models: ["m_ref"],                  host: "api", desc: "Commercial account reference code tables." },
  CommercialAccounts:  { domain: "accounts", models: ["m_account"],              host: "api", desc: "Commercial account profile: get, create, update." },
  GovernmentAccount:   { domain: "accounts", models: ["m_account"],              host: "api", desc: "Government account profile: get, create, update." },
  OrganizationAccount: { domain: "accounts", models: ["m_account","m_ref"],      host: "api", desc: "Organization account profile: code tables, get, create, update." },
  ProfileService:      { domain: "accounts", models: ["m_account"],              host: "api", desc: "Profile maintenance: update display name, delete profile." },
  ManageSubAccount:    { domain: "accounts", models: ["m_subaccount","m_ledger"],host: "api", desc: "Owner management of sub-accounts: create, update, close, delete, settle, upgrade, logs." },
  SubAccount:          { domain: "accounts", models: ["m_subaccount","m_balance","m_ledger"], host: "api", desc: "Sub-account view: balances, settings, transaction logs." },
  Transaction:         { domain: "money",    models: ["m_ledger","m_balance"],   host: "api", desc: "Core P2P transfer + transaction history/logs." },
  Exchange:            { domain: "money",    models: ["m_ledger","m_balance"],   host: "api", desc: "Send-to-someone, cash-in requests, exchange services & general info." },
  ThirdParty:          { domain: "money",    models: ["m_ledger","m_balance"],   host: "api", desc: "Merchant/third-party payment requests: create, pending, approve, cancel, status." },
  Banks:               { domain: "money",    models: ["m_bank","m_balance","m_ledger"], host: "bank", desc: "Bank rails: link CIF, cash deposit/withdraw/transfer, commissions, bank list." },
  MtnWallet:           { domain: "telecom",  models: ["m_telecom","m_balance","m_ledger"], host: "api", desc: "MTN Syria mobile-money: cash in/out, recharge, bundles, post-paid, logs." },
  SyriatelWallet:      { domain: "telecom",  models: ["m_telecom","m_balance","m_ledger"], host: "api", desc: "Syriatel mobile-money: cash in, recharge, bundles, post-paid, logs." },
  Billing:             { domain: "services", models: ["m_biller","m_balance","m_ledger"], host: "payment", desc: "Generic bill payment: fetch fields, presentment (fetch bill), pay, log." },
  ElectronicPayment:   { domain: "services", models: ["m_biller","m_balance","m_ledger"], host: "payment", desc: "Electronic payment: get bill, pay." },
  EducationService:    { domain: "services", models: ["m_biller","m_balance"],   host: "payment", desc: "Education service payments: list, presentment, pay." },
  Service:             { domain: "services", models: ["m_biller","m_balance"],   host: "api", desc: "Service catalog incl. Green Energy (fees & debts, pay) and containers." },
  ServiceNumber:       { domain: "services", models: ["m_biller"],               host: "api", desc: "Saved service numbers (biller accounts): list, create, update, delete." },
  Notification:        { domain: "platform", models: ["m_notif"],                host: "api", desc: "Notifications: list/delete for account and sub-accounts." },
  Governorate:         { domain: "platform", models: ["m_ref"],                  host: "api", desc: "Governorate (province) reference list." },
  Static:              { domain: "platform", models: ["m_ref"],                  host: "api", desc: "Static content: privacy policy, support info, version / force-update check." },
};

// Endpoints: path relative to <host>/v4/api/. method/auth INFERRED.
// auth: "public" (pre-login) | "auth" (Bearer required, inferred)
window.ENDPOINTS = [
  // Authentication
  ["Authentication/signin", "POST", "public", "Authenticate with phone number + security code (RSA-encrypted). Returns tokens; may require 2FA."],
  ["Authentication/verify", "POST", "public", "Verify OTP code sent during sign-in / registration."],
  ["Authentication/check2fa", "POST", "public", "Check / trigger two-factor authentication step during login."],
  ["Authentication/checkKYC", "GET", "auth", "Check the account's KYC verification status (gates full usage)."],
  ["Authentication/resetOtpCode", "POST", "public", "Resend / reset the OTP code."],
  ["Authentication/changePhoneNumber", "POST", "auth", "Change the account's registered phone number."],
  ["Authentication/changeSecurityCode", "POST", "auth", "Change the account security code (PIN)."],
  ["Authentication/logout/new", "POST", "auth", "Log the current session out."],
  // Session
  ["Session/create", "POST", "public", "Create a login session record after authentication."],
  ["Session/check", "GET", "auth", "Validate the current session / token."],
  ["Session/getAllSessions", "GET", "auth", "List all active sessions/devices for the account."],
  ["Session/logout", "POST", "auth", "Log out the current session."],
  ["Session/delete/", "POST", "auth", "Revoke a specific session by id (remote logout)."],
  // ForgotPassword
  ["ForgotPassword/GenerateOtp", "POST", "public", "Start forgot-password: generate an OTP to the phone/email."],
  ["ForgotPassword/CheckOtp", "POST", "public", "Verify the forgot-password OTP."],
  ["ForgotPassword/ChangePassword", "POST", "public", "Set a new password after OTP verification."],
  // ResetPassword
  ["ResetPassword/checkEmailOrPhone", "POST", "public", "Look up account by email or phone to begin reset."],
  ["ResetPassword/checkOtp", "POST", "public", "Verify the reset OTP."],
  ["ResetPassword/addNewPassword", "POST", "public", "Set the new password to complete reset."],
  // Account
  ["Account/balances", "GET", "auth", "Fetch the account's balances per currency."],
  ["Account/settings", "GET", "auth", "Get account settings/preferences."],
  ["Account/changePassword", "POST", "auth", "Change account password while logged in."],
  ["Account/changeLanguage", "POST", "auth", "Change UI/notification language preference."],
  ["Account/updateCurrencySetting", "POST", "auth", "Update preferred/display currency setting."],
  ["Account/editContact", "POST", "auth", "Edit the account's contact info (initiates verify)."],
  ["Account/verifyEditContact", "POST", "auth", "Verify (OTP) a contact-info change."],
  ["Account/getAccountByAddress", "POST", "auth", "Look up an account by its wallet address/number (recipient resolution for transfers)."],
  ["Account/AddDeviceKey", "POST", "auth", "Register/bind a device key (deviceId) to the account."],
  // AccountFavorites
  ["AccountFavorites/all", "GET", "auth", "List saved favourite payees."],
  ["AccountFavorites/new", "POST", "auth", "Add a favourite payee."],
  ["AccountFavorites/delete", "POST", "auth", "Remove a favourite payee."],
  // PersonalAccount
  ["PersonalAccount/get", "GET", "auth", "Get the personal account profile."],
  ["PersonalAccount/GetPersonalCodeTables", "GET", "public", "Reference/code tables for personal registration (dropdowns)."],
  ["PersonalAccount/new/v2", "POST", "auth", "Create a personal account (v2) with identity fields."],
  ["PersonalAccount/update/v2", "POST", "auth", "Update personal account (v2)."],
  ["PersonalAccount/verifyIdentity", "POST", "auth", "Submit identity/KYC data (national ID etc.)."],
  ["PersonalAccount/verifyIdentityCheck", "POST", "auth", "Check identity verification result."],
  // CommercialAccount(s)
  ["CommercialAccount/GetCodeTable", "GET", "public", "Reference code tables for commercial accounts."],
  ["CommercialAccounts/getProfile", "GET", "auth", "Get commercial account profile."],
  ["CommercialAccounts/new", "POST", "auth", "Create a commercial account."],
  ["CommercialAccounts/update", "POST", "auth", "Update a commercial account."],
  // GovernmentAccount
  ["GovernmentAccount/getProfile", "GET", "auth", "Get government account profile."],
  ["GovernmentAccount/new", "POST", "auth", "Create a government account."],
  ["GovernmentAccount/update", "POST", "auth", "Update a government account."],
  // OrganizationAccount
  ["OrganizationAccount/GetCodeTable", "GET", "public", "Reference code tables for organization accounts."],
  ["OrganizationAccount/getProfile", "GET", "auth", "Get organization account profile."],
  ["OrganizationAccount/new", "POST", "auth", "Create an organization account."],
  ["OrganizationAccount/update", "POST", "auth", "Update an organization account."],
  // ProfileService
  ["ProfileService/UpdateName/", "POST", "auth", "Update the profile display name (by id)."],
  ["ProfileService/Delete/", "POST", "auth", "Delete the profile (by id)."],
  // ManageSubAccount
  ["ManageSubAccount/new", "POST", "auth", "Create a sub-account."],
  ["ManageSubAccount/update", "POST", "auth", "Update a sub-account."],
  ["ManageSubAccount/close", "POST", "auth", "Close a sub-account."],
  ["ManageSubAccount/delete", "POST", "auth", "Delete a sub-account."],
  ["ManageSubAccount/checkRequest", "POST", "auth", "Check a sub-account request/status."],
  ["ManageSubAccount/getOwnerInfo", "GET", "auth", "Get the owner info for a sub-account."],
  ["ManageSubAccount/getSubAccountByOwner", "GET", "auth", "List sub-accounts for an owner."],
  ["ManageSubAccount/getTransactionLogs", "GET", "auth", "Sub-account transaction logs (owner view)."],
  ["ManageSubAccount/settleSubAccountByOwner", "POST", "auth", "Settle a sub-account's balance to the owner."],
  ["ManageSubAccount/upgradeAccount", "POST", "auth", "Upgrade a sub-account tier."],
  // SubAccount
  ["SubAccount/getSubAccountBalances", "GET", "auth", "Sub-account balances."],
  ["SubAccount/getSubAccountSettings", "GET", "auth", "Sub-account settings."],
  ["SubAccount/updateSubAccountSettings", "POST", "auth", "Update sub-account settings."],
  ["SubAccount/getTransactionLogs", "GET", "auth", "Sub-account transaction logs."],
  // Transaction
  ["Transaction/new", "POST", "auth", "Create a new transfer/transaction (P2P). Confirmed with security code."],
  ["Transaction/logs", "GET", "auth", "Recent transaction logs."],
  ["Transaction/history-logs", "GET", "auth", "Full transaction history."],
  // Exchange
  ["Exchange/createTransactionToSomeone", "POST", "auth", "Send money to another user (transfer)."],
  ["Exchange/createCashInRequest", "POST", "auth", "Create a cash-in request (receive money / agent top-up)."],
  ["Exchange/cancelCashInRequest", "POST", "auth", "Cancel a pending cash-in request."],
  ["Exchange/getServices", "GET", "auth", "List available exchange services."],
  ["Exchange/generalInfo", "GET", "auth", "General exchange info (rates/limits)."],
  ["Exchange/Log", "GET", "auth", "Exchange operation logs."],
  // ThirdParty
  ["ThirdParty/new", "POST", "auth", "Create a third-party/merchant payment request."],
  ["ThirdParty/pendingTransaction", "GET", "auth", "Pending third-party transactions (payer view)."],
  ["ThirdParty/pendingTransactionByThirdParty", "GET", "auth", "Pending transactions from the third-party's side."],
  ["ThirdParty/approvedRequests", "GET", "auth", "Approved third-party requests."],
  ["ThirdParty/changeTransactionStatus", "POST", "auth", "Approve/reject a third-party transaction."],
  ["ThirdParty/cancelThirdParty", "POST", "auth", "Cancel a third-party request."],
  // Banks
  ["Banks/getBanks", "GET", "auth", "List supported banks."],
  ["Banks/getAccounts", "GET", "auth", "List the user's linked bank accounts."],
  ["Banks/getCifs", "GET", "auth", "List linked bank CIF identities."],
  ["Banks/addCif", "POST", "auth", "Link a bank customer identity (CIF)."],
  ["Banks/confirmCif", "POST", "auth", "Confirm (OTP) a linked CIF."],
  ["Banks/cashDeposit", "POST", "auth", "Deposit cash from bank into the wallet."],
  ["Banks/cashWithdraw", "POST", "auth", "Withdraw wallet funds to bank/cash."],
  ["Banks/confirmWithdraw", "POST", "auth", "Confirm a withdrawal (OTP/step-up)."],
  ["Banks/cashTransfer", "POST", "auth", "Bank cash transfer."],
  ["Banks/getCommission", "POST", "auth", "Compute the commission/fee for a bank operation."],
  ["Banks/log", "GET", "auth", "Bank operation logs."],
  // Billing
  ["Billing/getBillingFields", "POST", "auth", "Get the input fields required for a biller."],
  ["Billing/presentment", "POST", "auth", "Fetch the bill (presentment) for a biller account."],
  ["Billing/pay", "POST", "auth", "Pay a bill."],
  ["Billing/log", "GET", "auth", "Billing logs."],
  // ElectronicPayment
  ["ElectronicPayment/getBill", "POST", "auth", "Fetch an electronic-payment bill."],
  ["ElectronicPayment/pay", "POST", "auth", "Pay an electronic-payment bill."],
  // EducationService
  ["EducationService/All", "GET", "auth", "List education services."],
  ["EducationService/presentment", "POST", "auth", "Fetch an education bill (presentment)."],
  ["EducationService/Payment/new", "POST", "auth", "Pay an education service."],
  // Service (incl. GreenEnergy)
  ["Service/Containers", "GET", "auth", "List service containers/categories."],
  ["Service/Containers/", "GET", "auth", "Get a service container by id."],
  ["Service/GreenEnergy/All", "GET", "auth", "List Green Energy services."],
  ["Service/GreenEnergy/FeesAndDebts", "POST", "auth", "Get Green Energy fees & outstanding debts."],
  ["Service/GreenEnergy/Pay", "POST", "auth", "Pay Green Energy fees."],
  ["Service/GreenEnergy/PayByType", "POST", "auth", "Pay Green Energy by a specific type."],
  // ServiceNumber
  ["ServiceNumber/all", "GET", "auth", "List saved service numbers (biller accounts)."],
  ["ServiceNumber/create", "POST", "auth", "Save a service number."],
  ["ServiceNumber/update", "POST", "auth", "Update a saved service number."],
  ["ServiceNumber/delete/", "POST", "auth", "Delete a saved service number by id."],
  // MtnWallet
  ["MtnWallet/create", "POST", "auth", "Register an MTN mobile-money wallet link."],
  ["MtnWallet/check", "POST", "auth", "Check MTN wallet status/eligibility."],
  ["MtnWallet/all", "GET", "auth", "List MTN wallet links."],
  ["MtnWallet/cashIn", "POST", "auth", "Cash in from MTN into ShamCash balance."],
  ["MtnWallet/cashOut", "POST", "auth", "Cash out from ShamCash to MTN."],
  ["MtnWallet/confirmCashOut", "POST", "auth", "Confirm an MTN cash-out (OTP/step-up)."],
  ["MtnWallet/calculatePaidAmount", "POST", "auth", "Calculate the payable amount incl. fees."],
  ["MtnWallet/chargePostPaid", "POST", "auth", "Pay an MTN post-paid charge."],
  ["MtnWallet/dynamicRecharge", "POST", "auth", "Dynamic (custom amount) MTN recharge."],
  ["MtnWallet/GetBundles", "GET", "auth", "List MTN data/voice bundles."],
  ["MtnWallet/ActiveBundles", "GET", "auth", "List active MTN bundles."],
  ["MtnWallet/log", "GET", "auth", "MTN wallet operation logs."],
  // SyriatelWallet
  ["SyriatelWallet/create", "POST", "auth", "Register a Syriatel mobile-money wallet link."],
  ["SyriatelWallet/check", "POST", "auth", "Check Syriatel wallet status/eligibility."],
  ["SyriatelWallet/all", "GET", "auth", "List Syriatel wallet links."],
  ["SyriatelWallet/cashIn", "POST", "auth", "Cash in from Syriatel into ShamCash balance."],
  ["SyriatelWallet/calculatePaidAmount", "POST", "auth", "Calculate the payable amount incl. fees."],
  ["SyriatelWallet/chargePostPaid", "POST", "auth", "Pay a Syriatel post-paid charge."],
  ["SyriatelWallet/dynamicRecharge", "POST", "auth", "Dynamic (custom amount) Syriatel recharge."],
  ["SyriatelWallet/log", "GET", "auth", "Syriatel wallet operation logs."],
  // Notification
  ["Notification/getAll", "GET", "auth", "List account notifications."],
  ["Notification/getAllSubNotifications", "GET", "auth", "List sub-account notifications."],
  ["Notification/delete", "POST", "auth", "Delete a notification."],
  ["Notification/deleteSubNotif", "POST", "auth", "Delete a sub-account notification."],
  // Governorate
  ["Governorate/all", "GET", "public", "List governorates (provinces) — reference data."],
  // Static
  ["Static/policy", "GET", "public", "Privacy policy / terms content."],
  ["Static/support", "GET", "public", "Support contact info."],
  ["Static/version/new", "GET", "public", "App version / force-update check on launch."],
];
