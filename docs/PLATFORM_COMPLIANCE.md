# Platform and content operations

**Review date: 7 October 2026.** This is an implementation checklist grounded in the official pages below. Platform rules change, account-specific conditions may apply, and permission metadata is an operator assertion rather than a legal determination.

## Rights before playback

Only add media you own or have documented permission to use in the intended live broadcast and exported clips. Check soundtrack, underlying footage, performers, logos, territory, commercial use and attribution requirements separately. A Creative Commons label is not enough: record the actual license and required attribution; NC/ND restrictions can conflict with commercial use or edits. Public availability, an iframe, a tab-capture prompt, a paid subscription or a video URL does not itself grant retransmission rights.

Queue entries store license, permission, attribution, source and category. Unknown/unapproved material cannot be selected by the brain for broadcast; manual selection rechecks this gate. The capture bridge additionally requires a permitted current capture entry, stops in safe mode and expires frames after three seconds. It cannot inspect whether the operator selected the same source that the permission record describes. The operator must verify the selected surface and private information before arming capture.

The project does not download or proxy arbitrary remote URLs, defeat DRM or circumvent access restrictions. Safe fallback uses an authored sample and synthetic stimuli. Clip markers are timing notes, not proof that footage was legally recorded or licensed for redistribution. For KICK video specifically, the Developer Agreement requires the official embedded player unless KICK gives prior written permission for another display system. Do not use the capture bridge to redistribute KICK video merely because a streamer agreed or the source is publicly viewable. [Developer Agreement, embedded experiences](https://dev.kick.com/terms-of-service).

KICK's terms require rights to submitted content and prohibit service abuse. KICK's copyright process can remove material, suspend access and terminate repeat infringers. Stop the questionable source immediately, preserve permission records, and use KICK's documented notice/counter-notice process where appropriate. [Terms of Service](https://kick.com/terms-of-service), [DMCA policy](https://kick.com/dmca-policy).

## Identity, behavior and disclosure

The character is a fictional entertainment layer. SOURCE pixels, MODELLED visual transforms, INFERRED model activity and the character's jokes remain separate; do not describe the character output as recorded fly thought or consciousness.

KICK's guidelines prohibit artificial views, followers or interactions, chat spam, deceptive synthetic impersonation and privacy violations. They require clear disclosure where AI mimics reality. The stream labels its fictional character; demo activity is distinctly marked. No demo event leaves the application as chat or populates real revenue.

Paid partnerships require KICK's Branded Content tool, visible disclosure, and spoken disclosure at the sponsored segment's start. A sponsor overlay alone does not satisfy every platform requirement. The local sponsor scheduler has start/end dates and frequency caps; the operator must also enable KICK's tool and make the spoken disclosure. Affiliate relationships must be clear near the link. This product does not implement paid-entry games, gambling or targeted pressure on individual viewers. [Community Guidelines](https://kick.com/community-guidelines).

The operator remains responsible for what appears live. The local moderation gate is conservative pattern checking, not comprehensive semantic or multilingual moderation. Incoming chat is never automatically read verbatim by TTS. External AI output is checked again and safe mode interrupts it. For public broadcasts, retain a reachable operator/moderator, test the emergency action, and inspect source content and chat; autonomy is not a guarantee of policy compliance.

## Developer data and security

The Developer Agreement restricts API access to documented functionality, requires appropriate permissions, protection of credentials, compliance with rate limits and necessary data use. It requires deletion on applicable requests/revocation/termination, and restricts sharing KICK data with third parties without prior written permission. [Developer Agreement](https://dev.kick.com/terms-of-service).

Accordingly, the implementation requests only used scopes, stores no tokens in the browser, verifies provider signatures, and isolates the public webhook. Optional AI receives only numerical visual signals and fictional character state; it does not receive KICK chat, viewer names, screenshots or OAuth data. Do not change that boundary without reviewing the applicable data permissions and provider arrangements.

State retains bounded user IDs, display names and game/community counters, not private profiles or emails. KICK's default cache allowance is 24 hours absent additional rights/authorization. Runtime maintenance removes inactive viewer identities and associated poll/game/supporter records after 24 hours, and removes real chat/events older than 24 hours. Save/load applies that text/identity cutoff too; real supporter identity entries are not persisted because they have no source timestamp. Monetary/event aggregate counters contain no retained message text or identity. The Delete viewer action removes that viewer's retained records from current state; it does not revoke account authorization. [Developer Agreement, storage](https://dev.kick.com/terms-of-service).

Runtime logs contain event type/status and technical counts rather than raw chat, tokens or request URLs. State is overwritten atomically, with no historical state backups; logs rotate at approximately 512 KiB to one previous file. Short-lived webhook replay IDs are saved with state to avoid duplicate counts across restart. A saved state older than 30 days is not reloaded. Local uploads remain until the operator removes them; they have a 100-file/1-GB quota. The data directory is local and ignored by Git; Windows inherits filesystem ACLs, so protect the account and exclude this directory from unnecessary cloud backup. Local exports/backups still need the operator's retention/deletion controls.

On deletion/revocation obligations, stop the server, delete the applicable local state/media and any operator backups/exports, disconnect the app and revoke authorization in KICK. Existing platform messages and independently exported recordings must be handled separately. No authentication or legal consent is inferred from a successful local upload.

## Partner eligibility and money

The official program application page lists verified status, completed profile/social links, a 30-day average of 75 concurrent viewers, 30 streamed hours, 25 active subscriptions, 250 unique chatters, three VODs and 250 followers. Meeting metrics permits an application; it does not guarantee admission, and the page says criteria can change. Track actual progress in the KICK dashboard. [Partner application requirements](https://help.kick.com/en/articles/8894103-how-to-join-the-kick-partner-program).

The partner terms include rights, confidentiality, data obligations and a multistreaming toggle requirement; multistreaming can affect compensation. Do not assume a virtual character, unattended stream, repeated footage or local retention score qualifies for payment. Eligibility and any account-specific compensation need confirmation from KICK before business projections. [Partner terms](https://kick.com/partner-terms-and-conditions).

Demo tips, subscriptions and conversion examples are simulation. Signed subscription events are subscription counts; no fixed payout or fiat revenue is inferred. Actual tips require a future verified payment-provider adapter. Sponsor counters describe local overlay presentations/clicks, not unique human reach or audited ad impressions. Viewer count remains unavailable until supplied by an actual platform API; no fake audience is generated.
