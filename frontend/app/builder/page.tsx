'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Will {
  id: string;
  person_name?: string;
  person_age?: number;
  person_address?: string;
  sound_mind?: boolean;
  executor?: { full_name: string };
  guardian?: { full_name: string };
  beneficiaries?: any[];
  assets?: any[];
  has_minor_children?: boolean;
  status: string;
}

interface ValidationResult {
  status: 'incomplete' | 'valid' | 'invalid';
  issues: { field: string; message: string; severity: 'error' | 'warning' }[];
}

export default function BuilderPage() {
  const router = useRouter();
  const [will, setWill] = useState<Will | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [willId, setWillId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    // Create a new will automatically (or you could fetch existing ones)
    api.post('/wills').then(res => {
      setWillId(res.data.id);
      fetchWill(res.data.id);
    }).catch(() => router.push('/login'));
  }, []);

  const fetchWill = async (id: string) => {
    const res = await api.get(`/wills/${id}`);
    setWill(res.data);
    // Fetch validation
    api.get(`/wills/${id}/validate`).then(v => setValidation(v.data)).catch(() => {});
  };

  const sendMessage = async () => {
    if (!input.trim() || !willId) return;
    setLoading(true);
    const userMsg = input;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    try {
      const res = await api.post(`/wills/${willId}/chat`, { message: userMsg });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
      await fetchWill(willId);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const downloadPDF = async () => {
  if (!willId) return;
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/wills/${willId}/document`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      alert('Failed to download PDF');
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Will-${will.person_name || 'draft'}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert('Error downloading PDF');
  }
};

  // Quick demo: load the pre‑seeded completed will
  const loadDemoWill = () => {
    console.log('Loading demo will...',will);
    const demoId = will?.id  || 'w2000000-0000-0000-0000-000000000001';
    setWillId(demoId);
    fetchWill(demoId);
  };

  if (!will) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* LEFT: Chat */}
      <div style={{ width: '50%', padding: '1rem', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
        <h2>Write Your Will</h2>
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', padding: '0.5rem', marginBottom: '0.5rem' }}>
          {chatMessages.map((m, i) => (
            <div key={i} style={{ marginBottom: '0.5rem', color: m.role === 'user' ? 'blue' : 'green' }}>
              <strong>{m.role === 'user' ? 'You' : 'Assistant'}:</strong> {m.content}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex' }}>
          <input
            style={{ flex: 1, padding: '0.5rem' }}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type your answer or start with 'Hi, I want to write a will.' "
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading} style={{ padding: '0.5rem 1rem' }}>Send</button>
        </div>
      </div>

      {/* RIGHT: Preview & Status */}
      <div style={{ width: '50%', padding: '1rem', overflowY: 'auto' }}>
        {/* <h2>Will Preview</h2> */}
        
        {/* Demo button (remove after testing) */}
        {/* <button onClick={loadDemoWill} style={{ marginBottom: '1rem' }}>Load Completed Demo Will</button> */}

        {validation && (
          <div>
            <h3>Status: {validation.status}</h3>
            {validation.issues.map((issue, i) => (
              <p key={i} style={{ color: issue.severity === 'error' ? 'red' : 'orange' }}>
                {issue.message}
              </p>
            ))}
          </div>
        )}

        <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem' }}>
          <h3>Declaration</h3>
          <p>I, <strong>{will.person_name || '...'}</strong>, aged {will.person_age || '...'}, of {will.person_address || '...'}, sound mind: {will.sound_mind ? 'Yes' : '...'}</p>

          <h3>Executor</h3>
          <p>{will.executor?.full_name || '...'}</p>

          <h3>Assets & Beneficiaries</h3>
          {will.assets?.map((asset: any) => (
            <div key={asset.id}>
              <strong>{asset.description}</strong>
              <ul>
                {asset.asset_shares?.map((share: any) => (
                  <li key={share.id}>{share.beneficiary?.full_name || '?'} – {share.share_percentage}%</li>
                ))}
              </ul>
            </div>
          ))}

          <h3>Witnesses</h3>
          <ul>
            {will.beneficiaries?.filter((b: any) => b.is_witness).map((w: any) => (
              <li key={w.id}>{w.full_name}</li>
            )) || '...'}
          </ul>
        </div>

        {validation?.status === 'valid' && (
          <button onClick={downloadPDF} style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '1rem' }}>
            Download Will (PDF)
          </button>
        )}
      </div>
    </div>
  );
}