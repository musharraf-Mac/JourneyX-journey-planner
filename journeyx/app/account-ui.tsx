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
 return <>{text.split(/(\*\*[^*]+\*\*|https:\/\/[^\s<>]+)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('https://')) {
      const url = part.replace(/[.,;!?]+$/, '');
      return <span key={i}><a href={url} target="_blank" rel="noreferrer">{url}</a>{part.slice(url.length)}</span>;
    }
    return part;
  })}</>;
}
function AssistantMessage({content}:{content:string}){
 const lines=content.replace(/^\*\*Answer\*\*\s*/i,'').split(/\r?\n/);
 return <div className="assistant-content">{lines.map((line,i)=>{
  const trimmed=line.trim();
  if(!trimmed)return <div className="assistant-spacer" key={i}/>;
  if(/^\|[-\s|]+\|$/.test(trimmed))return null;
  if(trimmed.includes('|'))return <div className="assistant-data-row" key={i}>{trimmed.split('|').map(cell=>cell.trim()).filter(Boolean).map((cell,j)=><span key={j}><InlineAssistantText text={cell}/></span>)}</div>;
  if(/^#{1,4}\s/.test(trimmed))return <h4 key={i}><InlineAssistantText text={trimmed.replace(/^#{1,4}\s/,'')}/></h4>;
  if(/^[-*]\s/.test(trimmed))return <p className="assistant-bullet" key={i}><span className="assistant-bullet-marker" aria-hidden="true">•</span><span className="assistant-bullet-text"><InlineAssistantText text={trimmed.replace(/^[-*]\s/,'')}/></span></p>;
  return <p key={i}><InlineAssistantText text={trimmed}/></p>;
 })}</div>;
}
export function Assistant({from,to,priority,disruptions}:{from:string;to:string;priority:string;disruptions:Disruption[]}){
 const[open,setOpen]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[messages,setMessages]=useState<ChatMessage[]>([{role:'assistant',content:'Ask me about any two covered stops, a bus number, or the route shown in the planner.'}]);
 const chatRef=useRef<HTMLDivElement>(null);
 useEffect(() => { const chat = chatRef.current; if (chat) chat.scrollTop = chat.scrollHeight; }, [messages, busy, open]);
 async function ask(e:FormEvent<HTMLFormElement>){e.preventDefault();const text=message.trim();if(!text||busy)return;setMessage('');setMessages(current=>[...current,{role:'user',content:text}]);setBusy(true);try{const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:messages,from,to,priority,disruptions})});const data=await r.json();setMessages(current=>[...current,{role:'assistant',content:data.answer??data.error??'The assistant did not return an answer.'}]);}catch{setMessages(current=>[...current,{role:'assistant',content:'Unable to reach the assistant. Please try again.'}]);}finally{setBusy(false);}}
 return <><button className="primary assistant-launch" onClick={()=>setOpen(true)}>✦ Journey assistant</button>{open&&<Modal title="Your journey assistant" onClose={()=>setOpen(false)}><div className="assistant-intro">Ask about a bus route, such as “Kaduwela to Kollupitiya”. Travel times and fares are demo estimates.</div><div className="assistant-chat" ref={chatRef} aria-live="polite">{messages.map((item,i)=><div className={`assistant-message ${item.role}`} key={`${item.role}-${i}`}><span className="assistant-role">{item.role==='user'?'You':'JourneyX'}</span>{item.role==='assistant'?<AssistantMessage content={item.content}/>:<p>{item.content}</p>}</div>)}{busy&&<div className="assistant-message assistant"><span className="assistant-role">JourneyX</span><p className="assistant-typing">Thinking<span>.</span><span>.</span><span>.</span></p></div>}</div><form className="assistant-composer" onSubmit={ask}><textarea required maxLength={2000} rows={2} aria-label="Ask about a bus journey" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ask about a bus or enter two stops…"/><div><span>{message.length}/2000</span><button className="primary" disabled={busy}>{busy?'Analysing…':'Send'}</button></div></form><div className="assistant-sources"><strong>Bus route sources</strong><a href="https://www.ntc.gov.lk/Bus_info/route_map.php" target="_blank" rel="noreferrer">NTC bus maps ↗</a></div></Modal>}</>;
}
