'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {Modal} from './components';
import type {Disruption} from '@/lib/network';
export function AccountDialog({onClose,onLogin}:{onClose:()=>void;onLogin:()=>void}){
 const [register,setRegister]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <Modal title={register?'Create your JourneyX account':'Welcome back'} onClose={onClose}><p className="muted">Explore as a guest. Sign in to save your journeys securely.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const form=new FormData(e.currentTarget);try{const r=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:register?'register':'login',name:form.get('name'),email:form.get('email'),password:form.get('password')})});const data=await r.json();if(!r.ok)throw Error(data.error);onLogin();onClose();}catch(e){setError(e instanceof Error?e.message:'Unable to sign in');}finally{setBusy(false);}}}>
 {register&&<label className="form-field">Name<input name="name" required maxLength={80} autoComplete="name"/></label>}<label className="form-field">Email<input name="email" type="email" required maxLength={254} autoComplete="email"/></label><label className="form-field">Password<input name="password" type="password" required minLength={10} maxLength={128} autoComplete={register?'new-password':'current-password'}/></label><p role="alert" className="muted">{error}</p><button className="primary" disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in'}</button><button type="button" className="text-button" style={{marginLeft:20}} onClick={()=>{setRegister(!register);setError('');}}>{register?'Already registered? Sign in':'New here? Register'}</button></form></Modal>;
}
type ChatMessage={role:'user'|'assistant';content:string};
function InlineAssistantText({text}:{text:string}){
 return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:<span key={i}>{part}</span>)}</>;
}
function AssistantMessage({content}:{content:string}){
 const lines=content.replace(/^\*\*Answer\*\*\s*/i,'').split(/\r?\n/);
 return <div className="assistant-content">{lines.map((line,i)=>{
  const trimmed=line.trim();
  if(!trimmed)return <div className="assistant-spacer" key={i}/>;
  if(/^\|[-\s|]+\|$/.test(trimmed))return null;
  if(trimmed.includes('|'))return <div className="assistant-data-row" key={i}>{trimmed.split('|').map(cell=>cell.trim()).filter(Boolean).map((cell,j)=><span key={j}><InlineAssistantText text={cell}/></span>)}</div>;
  if(/^#{1,4}\s/.test(trimmed))return <h4 key={i}><InlineAssistantText text={trimmed.replace(/^#{1,4}\s/,'')}/></h4>;
  if(/^[-*]\s/.test(trimmed))return <p className="assistant-bullet" key={i}><span>•</span><InlineAssistantText text={trimmed.replace(/^[-*]\s/,'')}/></p>;
  return <p key={i}><InlineAssistantText text={trimmed}/></p>;
 })}</div>;
}
export function Assistant({from,to,priority,mode,disruptions}:{from:string;to:string;priority:string;mode:string;disruptions:Disruption[]}){
 const[open,setOpen]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[messages,setMessages]=useState<ChatMessage[]>([{role:'assistant',content:'Hi, I can explain the route options currently shown. Ask me about time, fare, reliability, transfers, or simulated disruptions.'}]);
 const endRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages,busy]);
 async function ask(e:FormEvent<HTMLFormElement>){e.preventDefault();const text=message.trim();if(!text||busy)return;setMessage('');setMessages(current=>[...current,{role:'user',content:text}]);setBusy(true);try{const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:messages,from,to,priority,mode,disruptions})});const data=await r.json();setMessages(current=>[...current,{role:'assistant',content:data.answer??data.error??'The assistant did not return an answer.'}]);}catch{setMessages(current=>[...current,{role:'assistant',content:'Unable to reach the assistant. Please try again.'}]);}finally{setBusy(false);}}
 return <><button className="primary assistant-launch" onClick={()=>setOpen(true)}>✦ Journey assistant</button>{open&&<Modal title="Your journey assistant" onClose={()=>setOpen(false)}><div className="assistant-intro">AI explains the current demo routes. It cannot confirm live transport or unverified walking routes.</div><div className="assistant-chat" aria-live="polite">{messages.map((item,i)=><div className={`assistant-message ${item.role}`} key={`${item.role}-${i}`}><span className="assistant-role">{item.role==='user'?'You':'JourneyX'}</span>{item.role==='assistant'?<AssistantMessage content={item.content}/>:<p>{item.content}</p>}</div>)}{busy&&<div className="assistant-message assistant"><span className="assistant-role">JourneyX</span><p className="assistant-typing">Thinking<span>.</span><span>.</span><span>.</span></p></div>}<div ref={endRef}/></div><form className="assistant-composer" onSubmit={ask}><textarea required maxLength={2000} rows={2} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ask a follow-up about this journey..."/><div><span>{message.length}/2000</span><button className="primary" disabled={busy}>{busy?'Analysing…':'Send'}</button></div></form><div className="assistant-sources"><strong>Check actual services</strong><a href="https://eservices.railway.gov.lk/schedule/searchTrain.action" target="_blank" rel="noreferrer">Sri Lanka Railways ↗</a><a href="https://www.rdmns.lk/" target="_blank" rel="noreferrer">RDMNS updates ↗</a><a href="https://www.ntc.gov.lk/Bus_info/route_map.php" target="_blank" rel="noreferrer">NTC bus maps ↗</a></div></Modal>}</>;
}
