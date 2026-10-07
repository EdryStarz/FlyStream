import {lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
import './stream/stream.css';
const Science=lazy(()=>import('./ScienceApp').then(m=>({default:m.ScienceApp})));
const Control=lazy(()=>import('./stream/ControlRoom').then(m=>({default:m.ControlRoom})));
const Stream=lazy(()=>import('./stream/StreamOutput').then(m=>({default:m.StreamRoute})));
const path=location.pathname;document.documentElement.classList.toggle('stream-document',path==='/stream');
createRoot(document.getElementById('root')!).render(<Suspense fallback={<div className="control-loading">Preparing M0XA…</div>}>{path==='/science'?<Science/>:path==='/stream'?<Stream/>:<Control/>}</Suspense>);
