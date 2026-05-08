import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { ShieldCheck, FileUp, AlertCircle, CheckCircle2, Search, Loader2 } from 'lucide-react';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const onDrop = useCallback(acceptedFiles => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const handleVerify = async () => {
    if (!file) return;
    setLoading(true);
    setResults([]); // Reset results for new verification
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server error occurred');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialLine = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = (partialLine + chunk).split("\n");
        partialLine = lines.pop(); // Store unfinished line for next chunk

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.error) {
                alert(data.error);
                continue;
              }
              setResults(prev => [...prev, data]);
            } catch (e) {
              console.error("Failed to parse JSON line:", line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Verification failed', error);
      alert('Verification error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <ShieldCheck size={48} color="#7c3aed" />
          <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 800, letterSpacing: '-0.025em' }}>
            The Fact-Check <span style={{ color: '#7c3aed' }}>Agent</span>
          </h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem' }}>
          Automated truth-layer for your marketing content and reports.
        </p>
      </header>

      <main className="glass-panel">
        {!results.length ? (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div {...getRootProps()} className="dropzone">
              <input {...getInputProps()} />
              <FileUp size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              {file ? (
                <p style={{ fontWeight: 600, color: '#4ade80' }}>{file.name} selected</p>
              ) : isDragActive ? (
                <p>Drop the PDF here...</p>
              ) : (
                <div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Upload PDF to Verify</p>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>Drag and drop or click to browse</p>
                </div>
              )}
            </div>
            
            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '2rem' }}
              onClick={handleVerify}
              disabled={!file || loading}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Loader2 className="animate-spin" /> Verifying Claims...
                </div>
              ) : (
                'Start Automated Fact-Check'
              )}
            </button>
          </div>
        ) : (
          <div className="results-container" style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>Verification Report</h2>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <div className="status-badge status-verified">Verified: {results.filter(r => r.status === 'Verified').length}</div>
                  <div className="status-badge status-inaccurate">Inaccurate: {results.filter(r => r.status === 'Inaccurate').length}</div>
                  <div className="status-badge status-false">False: {results.filter(r => r.status === 'False').length}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => window.print()}>Download Report</button>
                <button className="btn-primary" onClick={() => setResults([])}>Verify Another</button>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>CLAIM</th>
                  <th>LIVE EVIDENCE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ width: '40%' }}>
                      <p style={{ margin: 0, fontWeight: 500 }}>{item.claim}</p>
                      <small style={{ color: 'rgba(255,255,255,0.4)' }}>Context: {item.context}</small>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                        <Search size={16} style={{ marginTop: '3px', color: '#7c3aed' }} />
                        <div>
                          <p style={{ margin: 0, fontSize: '0.875rem' }}>{item.evidence}</p>
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#4ade80' }}>Real Fact: {item.realFact}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ width: '120px' }}>
                      <span className={`status-badge status-${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer style={{ marginTop: '4rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
        <p>© 2026 Fact-Check Agent • Powered by Gemini & Tavily</p>
      </footer>
    </div>
  );
}

export default App;
