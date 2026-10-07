# Virtual Fly Brain research for Flystream

Retrieved 2026-09-16 from the live public VFB MCP API. API successfully initialized using protocol 2024-11-05; server vfb3-mcp-server version 1.11.2. Endpoint: https://vfb3-mcp.virtualflybrain.org. The environment has no native VFB connector; the current official MCP endpoint was called directly with JSON-RPC over HTTPS via Python requests. No credential is needed.

## Integration artifacts

Use integration-manifest.json for the six selected connected example neurons and all three region meshes. Each neuron includes absolute local SWC path, exact canonical type text, source download URL, VFB viewer link, template, dataset, tracing status, verified structural edges, and transmitter prediction only when the individual metadata supplies one. vfb-manifest.json contains all ten downloaded neurons and the broader top partner tables.

All skeletons and meshes share VFB_00101567 (JRC2018Unisex). Preserve the raw coordinates and use one scene transform across all structures. Bilateral neuropil meshes include both brain sides; selected neurons are right-side examples. These are example neurons spanning several columns, not a full retinotopic reconstruction.

## Verified circuit subset

- Mi1_R, VFB_001041bq, JRC_OpticLobe:39964 -> T4a_R, VFB_00104bfr, JRC_OpticLobe:115402: 25 anatomical synapses.
- Tm3_R, VFB_00104jor, JRC_OpticLobe:94380 -> same T4a: 12 anatomical synapses.
- Tm2_R, VFB_00104iha, JRC_OpticLobe:65363 -> T5a_R, VFB_00104dxc, JRC_OpticLobe:135502: 21 anatomical synapses.
- T4a -> HSE_R, VFB_00103s4o, JRC_OpticLobe:10016: 13 anatomical synapses.
- T5a -> same HSE: 21 anatomical synapses.

Edges derive from full NeuronNeuronConnectivityQuery responses, retrieved only after each entity advertised that query in get_term_info. inputs means partner -> focal neuron; outputs means focal neuron -> partner. Count status is exact and results uncapped for the saved six queried individuals. Counts must not be interpreted as physiological weights, firing rates or live activity. Do not invent a connection between other representative examples in the folder.

## Dataset and attribution

VFB dataset ID Nern2024. VFB name: Optic Lobe connectome neurons from optic_lobe:v1.0.1, Nern et al., 2024. Individual xrefs identify JRC_Optic-Lobe:v1.0.1. It includes skeletons, meshes and synaptic connectivity traced from part of the male CNS EM volume. The final publication is Nern et al. (2025), Nature 641, 1225-1237, https://doi.org/10.1038/s41586-025-08746-0 . Do not mistake the dataset label year 2024 for the final paper year.

Neuron SWCs: CC-BY 4.0, credited to optic-lobe dataset/Nern et al. and Virtual Fly Brain. VFB metadata identifies them as roughly traced. Meshes VFB_00102107 (medulla), VFB_00102109 (lobula), VFB_00102110 (lobula plate): CC-BY-NC-SA 4.0, source JRC 2018 templates & ROIs. This different license must be retained.

## Classes confirmed from live VFB

T4: FBbt_00003731; T4a: FBbt_00003732; T5: FBbt_00003736; T5a: FBbt_00003737; Mi1: FBbt_00003776; Tm3: FBbt_00003791; Tm9: FBbt_00003797; L1: FBbt_00003719. FBbt IDs are ontology classes; VFB IDs identify individual image-bearing reconstructions. They are not interchangeable.

The live T4a/T5a class descriptions refer to diagonal front-to-back preference, citing Henning et al. 2022, https://doi.org/10.1126/sciadv.abi7112 . A screen-space horizontal filter should be labelled an illustrative motion-channel proxy, not a measured receptive field or exact body-centred preference of these individual skeletons.

Individual transmitter predictions: Mi1 39964 92% acetylcholine; Tm3 94380 92% acetylcholine; Tm2 65363 89% acetylcholine. T4a/T5a/HSE example metadata lacks individual transmitter prediction; the manifest leaves it null. T4/T5 classes carry Cholinergic annotations, but that is class-level evidence.

## Workshop workflow applied

Session 1: ontology class search then individual IDs across datasets. https://workshop.virtualflybrain.org/sessions/session-1-discovery/
Session 3: explicit common template and registered SWC/OBJ downloads. https://workshop.virtualflybrain.org/sessions/session-3-visualisation/
Session 4: individual structural partner tables with outputs and inputs, retaining individual IDs. https://workshop.virtualflybrain.org/sessions/session-4-connectomics/
Session 7: chain discovery -> instances -> visualisation -> partners with reproducible IDs. https://workshop.virtualflybrain.org/sessions/session-7-putting-it-together/
Current MCP instructions: https://workshop.virtualflybrain.org/setup/

## Raw evidence and validation

mcp-tools.json retains server tool schemas and instructions. classes.json, dataset-tm3-t4.json, individuals.json, partners-regions.json retain decoded get_term_info responses. connectivity.json contains exact query responses. Search responses are retained in search-*.json, optic-datasets.json and tm3.json. Each downloaded file was HTTP-success checked and parsed. All SWC parents resolve or are root markers; manifests include SHA-256 and bounds. No fabricated anatomy, weights, recordings or physiological parameters were added.

## Visual model evidence

- Juusola et al., eLife 2017, https://elifesciences.org/articles/26117 : approximately 750 ommatidia per eye, average 4.5-degree sampling, neural superposition and retinal movements. This app uses only a partial screen patch, not 750 arbitrary video pixels or a literal perceptual image.
- Reiser & Dickinson, J Exp Biol 2013, https://doi.org/10.1242/jeb.074732 : published EMD model with 5-degree optical acceptance FWHM, 4.5-degree sampling and 30-ms delay. Adaptation 200 ms, display gain and 100-degree stimulus width in the app are software assumptions.
- Maisak et al., Nature 2013, https://www.nature.com/articles/nature12320 : T4/T5 ON/OFF direction pathways.
- Haag, Mishra & Borst, eLife 2017, https://elifesciences.org/articles/29044 : preferred-direction enhancement and null-direction suppression; the app's delayed correlator omits this detailed circuitry.
- Salcedo et al., J Neurosci 1999, https://pmc.ncbi.nlm.nih.gov/articles/PMC6784940/ ; Sharkey et al., Scientific Reports 2020, https://pmc.ncbi.nlm.nih.gov/articles/PMC7588446/ : spectral receptor specialization and native filtering. No exact receptor excitation or UV recovery is claimed from RGB.

## Implemented computation

Input is letterboxed into the displayed 16:9 stimulus surface and reduced to 192 x 108 for computation. sRGB is linearized before luminance. A flat-screen tangent projection sets sample positions from angular coordinates; a Gaussian angular-distance kernel integrates before subsampling. The rectangular screen is an assumed stimulus at a selected angular size, not the complete field of both eyes. The Gaussian is truncated at three sigma and renormalized at the visible screen boundary. The display hexagons are an approximate rendering of those computed samples, not anatomical facets.

An exponentially adapting luminance baseline produces rectified positive and negative contrast. Separately delayed ON and OFF values feed opposing local correlations, then four cardinal energies. Vertical pairs span two staggered rows and horizontal pairs one column; their different baselines prevent treating them as calibrated physical velocities. Values are dimensionless. A bounded rolling trace and the anatomy overlay use the current processed-frame metrics; selected anatomical edges are never used as synaptic weights.

An ON contrast drive overlays T4a, Mi1 and Tm3 examples; Tm2 is an explicitly generic feature overlay rather than a fitted neuron response. T5a uses OFF drive and HSE uses pooled horizontal energy. The UI states that these are feature overlays on examples, not individual neuronal activity predictions. No spike rates, voltages, calcium recordings or real-time measurements are fabricated. A future scientifically fitted model should use retinotopic receptive fields, calibrated display spectra, experimentally fitted temporal filters and validated circuit dynamics.

## Kick constraints

Official embed: https://player.kick.com/jesusavgn?autoplay=false&muted=true , documented at https://help.kick.com/en/articles/8010826-how-to-embed-your-kick-livestream . Its cross-origin pixels are unavailable to the app. getDisplayMedia supplies browser-authorized pixels after an explicit user choice. Local files and a generated synthetic WebM are fully supported alternative sources.

Official authenticated status API: https://docs.kick.com/apis/channels . No credentials have been supplied. UI distinguishes unknown broadcast availability from a live screen-capture connection. An optional same-origin status adapter permits authenticated LIVE/OFFLINE polling without exposing credentials in the browser. The public Kick page was observed offline during the September 16 research; that historical observation is not hardcoded as current status.
