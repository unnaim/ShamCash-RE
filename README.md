<div align="center">

# ShamCash, Under the Microscope

### There are endless rumors that ShamCash is not safe. So I decided to end the debate with facts, and what I found was not what I expected.

![Analysis](https://img.shields.io/badge/analysis-static%20reverse%20engineering-informational)
![Target](https://img.shields.io/badge/target-ShamCash%20v2.2.6-blue)
![Endpoints mapped](https://img.shields.io/badge/endpoints%20mapped-137-success)

</div>

> **Note:** A full interactive graph of the entire reverse-engineering result (every endpoint, service, and data model in the backend, laid out as an explorable map) is linked at the very end of this document.

---

## Why this exists

If you have spent any time in Syrian tech circles, you have heard it. "ShamCash is insecure." "They can drain your wallet." "The app is a backdoor." Lots of noise, very little proof.

I do not like settling technical questions with opinions, so I did the one thing that actually answers them. I pulled the app apart and looked at how it is really built: what it stores, how it encrypts data, and which servers it talks to.

This repository is the result. It is a static reverse-engineering study, and everything in it comes from inspecting the app package itself. Nothing here came from attacking a server, touching an account, or watching live traffic.

---

## Is any of this legal?

Yes. Here is why.

This project only ever inspected a file. I downloaded the publicly available ShamCash app onto my own device and analyzed that copy offline. It never accessed, probed, disrupted, or contacted a ShamCash server, and it never touched anyone else's account or data. That is the distinction the law turns on.

| Jurisdiction | What the law says | Why this work is covered |
|---|---|---|
| **Syria** | **Cybercrime Law No. 20 of 2022** (in force May 2022, replacing Law No. 17 of 2012). Its computer offenses target unauthorized *access to* and *interference with* information systems, networks, and websites, plus interception of data in transit. | The law is about breaking into or disrupting systems. Reading and analyzing a software file that is already lawfully on your own device is not access to a network, and it is not interception of anyone's data. No ShamCash system was ever accessed, so none of these offenses apply. |
| **United States** | **DMCA section 1201(f)** allows reverse engineering for interoperability, and the Copyright Office keeps standing exemptions for good-faith security and encryption research. | Extracting readable strings from an unencrypted application snapshot is not circumvention of a protection measure to begin with, and interoperability and security research are protected on top of that. |
| **European Union** | **Directive 2009/24/EC, Article 5(3)** lets a lawful user observe, study, and test how a program works to figure out the ideas behind it, without the rightholder's permission. Article 6 allows decompilation for interoperability. The CJEU confirmed this in Case C-13/20 (Top System, 2021). | Studying software you hold legally, in order to understand how it works, is a right the Directive grants outright. |

One limit is worth stating. The protections above apply to static analysis of a legally obtained app package, which is all this repository contains. They do not extend to breaking into servers, accessing other people's accounts, or live testing, none of which happened here.

---

## How I did it

The goal was to rebuild the app's backend and security design from the shipped binary.

1. **Unpacked the APK.** An Android app is just an archive. Unzipping it and running it through `apktool` exposes the manifest, permissions, bundled assets, native libraries, and the app's own resources.
2. **Identified the build.** The manifest and the libraries made the stack clear. This is a Flutter and Dart app, compiled ahead of time into a native `libapp.so` snapshot, and built with `--obfuscate`, which strips the human-readable symbol names.
3. **Recovered the Dart code.** Obfuscation hides names, but it does not encrypt the snapshot. Using [Blutter](https://github.com/worawit/blutter) to parse the Dart snapshot, I recovered the object pool, the class structure, and every string the app ships: URLs, endpoint paths, JSON field names, headers, and error messages, all of it in cleartext.
4. **Analyzed the crypto and native layer.** The bundled RSA library and server public keys were examined directly to understand how the app protects sensitive values before they leave the device.
5. **Mapped and modeled it.** The recovered endpoints and data structures were organized into a domain, service, and endpoint model, then rendered as the interactive graph linked below.

No live server was ever contacted. Every conclusion is drawn from the static files.

---

## What I found

### The architecture
A Flutter and Dart application talking to a REST backend across several hosts (`api.shamcash.sy` and its failover mirrors, plus dedicated `bank.` and `payment.` hosts). The reconstruction surfaced 137 endpoints across roughly two dozen controllers, covering authentication, accounts, money movement, telecom wallets (MTN and Syriatel), bill payments, and more, along with 11 core data models.

### The security posture

| Area | Finding | Verdict |
|---|---|---|
| **Transport security** | Ships its own certificate and CA pinning material (ISRG Root X1 plus a bundled CA), which raises the bar against man-in-the-middle interception. | Strong |
| **Symmetric crypto** | AES-GCM, an authenticated encryption mode. The correct, modern choice. | Strong |
| **Asymmetric crypto** | Sensitive values such as the security code are wrapped with a bundled RSA-2048 server public key through a native library, and there is evidence of key rotation. | Solid |
| **Token storage** | Uses `flutter_secure_storage`, backed by the Android Keystore, for auth tokens. That is the intended secure store. | Good |
| **Hardcoded secrets** | No private keys, no AES keys, and no bearer tokens are baked into the binary. The only embedded keys are public keys and a Firebase client key, which are non-secret by design. | Clean |
| **Backup exposure** | `allowBackup="false"` blocks trivial `adb backup` extraction. | Good |
| **RSA padding** | Uses PKCS#1 v1.5 rather than the more modern OAEP. Slightly weaker in theory, so a hardening opportunity rather than a live break. | Minor |
| **Local support-chat data** | The bundled support-chat library stores its chat and contact history locally without encryption at rest, readable only on a device that is already compromised or rooted. | Minor |
| **Storage permission** | Requests broad filesystem access, a wide privacy surface for a finance app, though not a vulnerability on its own. | Minor |

### What I did not find
No hardcoded credentials. No secret keys shipped inside the app. No sign of a backdoor. No plaintext handling of your PIN or password. None of the dramatic claims from the rumor mill survived contact with the actual binary.

---

## The verdict

ShamCash is a well-built, secure app, and the rumors do not hold up.

I went in ready to either confirm the horror stories or debunk them, and the evidence points clearly one way. The app does the important things right: modern authenticated encryption, RSA-wrapped sensitive fields, certificate pinning, Keystore-backed token storage, and no secrets left lying around in the binary.

It is not as heavily fortified as the top tier of global banking apps. Those tend to add aggressive runtime anti-tampering, root and emulator detection, and OAEP-grade padding. The few rough edges here, namely PKCS#1 v1.5 padding, unencrypted local support-chat data, and a broad storage permission, are real but minor, and none of them expose your money or your credentials.

Judged on the actual code rather than the gossip, ShamCash is reliable and safe to use. The debate can end here, with facts.

> **Scope and limitations:** This is static, client-side analysis. It describes how the app is built and what it protects on the device. It does not, and cannot, say anything about live server-side behavior, which would need authorized dynamic testing that was intentionally not part of this work. Hosts, methods, and auth requirements noted here are inferred from the binary, not confirmed against a server.

---

## Explore the full map

Everything above was rebuilt into an interactive, multi-engine graph of the ShamCash backend. You can pan, zoom, search, and trace how every domain, service, endpoint, and data model connects.

<div align="center">

### [Open the interactive graph](https://unnaim.github.io/ShamCash-RE/graph/)

*(Served via GitHub Pages once enabled, or open `graph/index.html` locally.)*

</div>

---

<div align="center">
<sub>Static reverse-engineering study for educational and security-research purposes. Not affiliated with, endorsed by, or authorized by ShamCash. All analysis was performed on a lawfully obtained copy of the application, and no live systems were accessed.</sub>
</div>
