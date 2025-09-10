'use client';
export const dynamic = "force-dynamic";

import React, { useState, useRef, useMemo } from 'react';

export default function Page() {
  const [prompt, setPrompt] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [metaOverride, setMetaOverride] = useState('');
  const [evidenceConfidence, setEvidenceConfidence] = useState(null);
  const [evidenceSources, setEvidenceSources] = useState([]);
  const controllerRef = useRef(null);
  const bufferRef = useRef('');

  async function handleGenerate(e) {
    e?.preventDefault();
    setContent(''); setStreaming(true); bufferRef.current='';
    if (controllerRef.current) controllerRef.current.abort();
    const ctrl=new AbortController(); controllerRef.current=ctrl;

    try{
      const res=await fetch('/api/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt}),signal:ctrl.signal});
      const reader=res.body.getReader(); const decoder=new TextDecoder('utf-8');
      let seoCaptured=false;
      while(true){const {done,value}=await reader.read(); if(done) break;
        bufferRef.current+=decoder.decode(value,{stream:true});
        if(!seoCaptured){ // look for SEO + evidence block
          const start=bufferRef.current.indexOf('<!--SEO_START');
          const end=bufferRef.current.indexOf('SEO_END-->');
          if(start!==-1&&end!==-1){
            const block=bufferRef.current.slice(start,end);
            try{
              const json=block.match(/{.*}/s); if(json){const parsed=JSON.parse(json[0]);
                setTitleOverride(parsed.title||''); setMetaOverride(parsed.meta||'');
                if(parsed.confidence) setEvidenceConfidence(parsed.confidence);
                if(parsed.sources) setEvidenceSources(parsed.sources);
              }
            }catch{}
            bufferRef.current=bufferRef.current.slice(end+9); seoCaptured=true;
          }
        }
        // append everything else
        setContent(prev=>prev+bufferRef.current); bufferRef.current='';
      }
    }catch(err){console.error(err);}finally{setStreaming(false); controllerRef.current=null;}
  }

  function handleCopy(){navigator.clipboard.writeText(content);}

  const metrics=useMemo(()=>computeSEO(content,titleOverride,metaOverride,prompt,evidenceConfidence,evidenceSources),
    [content,titleOverride,metaOverride,prompt,evidenceConfidence,evidenceSources]);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 bg-white rounded-lg shadow p-6">
          <form onSubmit={handleGenerate} className="flex gap-2 mb-4">
            <input value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Enter topic…" className="flex-1 border px-3 py-2 rounded"/>
            <button className="bg-blue-600 text-white px-4 rounded" disabled={streaming}>{streaming?'...':'Generate'}</button>
          </form>
          <input value={titleOverride} onChange={e=>setTitleOverride(e.target.value)} placeholder="SEO Title" className="w-full text-xl font-semibold mb-2"/>
          <input value={metaOverride} onChange={e=>setMetaOverride(e.target.value)} placeholder="Meta description" className="w-full text-sm mb-4"/>
          <div className="prose prose-xl lg:prose-2xl">{content||<p className="text-gray-400">Streaming article will appear here…</p>}</div>
          <button onClick={handleCopy} className="mt-4 bg-gray-800 text-white px-3 py-1 rounded">Copy</button>
        </section>
        <aside className="lg:col-span-4 bg-white rounded-lg shadow p-6 text-sm">
          <div className="font-semibold mb-2">SEO Score: {metrics.score} ({metrics.grade})</div>
          <div>Confidence: {metrics.evidenceConfidence?`${metrics.evidenceConfidence}%`:'N/A'}</div>
          <div className="mt-2">Sources:</div>
          <ul className="list-disc pl-4">{metrics.evidenceSources.map((s,i)=><li key={i}><a href={s} className="text-blue-600 underline" target="_blank">{s}</a></li>)}</ul>
          <div className="mt-3">Suggestions:</div>
          <ul className="list-disc pl-4">{metrics.suggestions.map((s,i)=><li key={i}>{s}</li>)}</ul>
        </aside>
      </div>
    </main>
  );
}

function computeSEO(text,title,meta,prompt,evidenceConfidence,evidenceSources){
  const words=(text||'').split(/\s+/).filter(Boolean).length;
  const score=words>600?80:words>400?65:40;
  const grade=score>=80?'Excellent':score>=60?'Good':'Fair';
  const suggestions=[]; if(!title) suggestions.push('Add a title'); if(!meta) suggestions.push('Add a meta description'); if(words<600) suggestions.push('Increase length');
  return {score,grade,suggestions,evidenceConfidence,evidenceSources};
}
