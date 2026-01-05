import React, { useState, useRef } from 'react';
import './index.css';

// --- Icons ---
const IconUpload = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
);
const IconFile = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
);
const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
const IconAlert = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);

// --- Components ---

function FileUploader({ title, file, onUpload, accept = ".xlsx, .xls" }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="card" style={{ flex: 1 }}>
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {file ? <span style={{ color: 'var(--success)' }}><IconCheck /></span> : <span style={{ color: 'var(--text-muted)' }}>•</span>}
        {title}
      </h3>

      {!file ? (
        <div
          className="upload-zone"
          onClick={() => inputRef.current.click()}
        >
          <div style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}><IconUpload /></div>
          <p style={{ margin: 0, fontWeight: 500 }}>點擊上傳檔案</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>支援 Excel (.xlsx)</p>
          <input
            type="file"
            ref={inputRef}
            onChange={handleChange}
            accept={accept}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div className="file-item">
          <div className="icon"><IconFile /></div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            <strong>{file.name}</strong><br />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <button
            className="btn-outline"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            onClick={() => onUpload(null)}
          >
            移除
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  // Step 1: Upload, 2: Preview, 3: Sending/Result
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState({ teacher: null, sub: null });
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [expandedId, setExpandedId] = useState(null); // For preview details
  const [envConfig, setEnvConfig] = useState({
    smtp_server: "mock",
    smtp_port: 587,
    smtp_user: "admin@school.edu.tw",
    smtp_password: "password",
    sender_name: "教務處"
  });

  const [showHelp, setShowHelp] = useState(false);

  const handleUpload = async () => {
    if (!files.teacher || !files.sub) {
      setError("請務必上傳「教師電子郵件清冊」與「調代課通知單」");
      return;
    }
    setLoading(true);
    setError(null);

    // Construct FormData
    const formData = new FormData();
    formData.append("teacher_file", files.teacher);
    formData.append("sub_file", files.sub);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const res = await fetch(`${API_BASE}/api/preview`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "資料分析失敗，請檢查 Excel 格式");
      }

      const data = await res.json();
      // Sort by email missing status (put missing on top for visibility) or name
      const sortedData = data.sort((a, b) => {
        if (!a.email && b.email) return -1;
        if (a.email && !b.email) return 1;
        return 0;
      });

      setPreviewData(sortedData);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const validCount = previewData.filter(p => p.email).length;
    if (!window.confirm(`即將寄出 ${validCount} 封通知信，確定嗎？`)) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        config: envConfig,
        notifications: previewData
      };

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const res = await fetch(`${API_BASE}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("寄送過程發生錯誤");

      const resData = await res.json();
      setResults(resData);
      setStep(3);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFiles({ teacher: null, sub: null });
    setPreviewData([]);
    setResults([]);
    setError(null);
  }

  // Calculate stats
  const totalEmails = previewData.length;
  const missingEmails = previewData.filter(p => !p.email).length;

  const toggleExpand = (name) => {
    if (expandedId === name) setExpandedId(null);
    else setExpandedId(name);
  }

  return (
    <div className="container animate-fade-in">
      <header style={{ marginBottom: '2rem', textAlign: 'center', position: 'relative' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          🏫 調代課通知自動化平台
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          行政作業自動化：匯入資料 ➔ 預覽確認 ➔ 寄送通知
        </p>
        <button
          onClick={() => setShowHelp(true)}
          style={{
            position: 'absolute', top: 0, right: 0,
            background: 'transparent', border: '1px solid var(--primary)',
            color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem'
          }}
        >
          📖 使用說明
        </button>
      </header>

      {/* Error Message Display */}
      {error && (
        <div className="animate-fade-in" style={{
          background: '#fef2f2',
          border: '1px solid #ef4444',
          color: '#b91c1c',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'start',
          gap: '0.75rem'
        }}>
          <div style={{ marginTop: '2px' }}><IconAlert /></div>
          <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{error}</div>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b91c1c',
              cursor: 'pointer',
              fontSize: '1.2rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowHelp(false)}>×</button>
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: 'var(--primary)' }}>📖 系統使用說明</h2>

            <div className="help-section">
              <h3>1. Excel 檔案格式範例</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>請確保您的 Excel 檔案包含以下對應欄位（系統支援常見欄位名稱）：</p>

              <h4 style={{ fontSize: '1rem', marginTop: '1rem' }}>📄 教師電子郵件.xlsx</h4>
              <table className="help-table">
                <thead><tr><th>教師姓名 (或 Name)</th><th>電子郵件 (或 Email)</th></tr></thead>
                <tbody><tr><td>王小明</td><td>wang@school.edu.tw</td></tr></tbody>
              </table>

              <h4 style={{ fontSize: '1rem', marginTop: '1rem' }}>📄 調代課通知單.xlsx</h4>
              <table className="help-table">
                <thead>
                  <tr>
                    <th>日期</th><th>節次</th><th>班級</th><th>課程名稱</th><th>原授課教師</th><th>代課教師</th><th>假別</th><th>原日期</th><th>原節次</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>2024/01/01</td><td>第一節</td><td>801</td><td>國文</td><td>王小明</td><td>李大華</td><td>公假</td><td>(非調課免填)</td><td>(非調課免填)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="help-section">
              <h3>2. 如何取得 Gmail 應用程式密碼？</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                因為安全性考量，系統無法直接使用您的登入密碼。請依步驟取得 16 位數專用密碼：
              </p>
              <ol style={{ fontSize: '0.9rem', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
                <li>登入 <a href="https://myaccount.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Google 帳號管理頁面</a>。</li>
                <li>點選左側 <b>「安全性」 (Security)</b>。</li>
                <li>確認 <b>「兩步驟驗證」</b> 為開啟狀態。</li>
                <li>在搜尋欄輸入「應用程式密碼」並進入。</li>
                <li>應用程式選「其他」➔ 輸入名稱 (如: 學校系統) ➔ 點擊「產生」。</li>
                <li>複製顯示的 <b>16 位英文字母</b>，貼入本系統密碼欄位即可。</li>
              </ol>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-primary" onClick={() => setShowHelp(false)}>我瞭解了</button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
              第一步：匯入資料
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              請上傳「教師電子郵件清冊」與本週的「調代課通知單」Excel 檔。
              <br />
              <small>系統將自動合併資料，並依教師姓名歸戶。</small>
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <FileUploader
                title="1️⃣ 教師電子郵件清冊"
                file={files.teacher}
                onUpload={(f) => setFiles(prev => ({ ...prev, teacher: f }))}
              />
              <FileUploader
                title="2️⃣ 調代課通知單"
                file={files.sub}
                onUpload={(f) => setFiles(prev => ({ ...prev, sub: f }))}
              />
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
              onClick={handleUpload}
              disabled={loading || !files.teacher || !files.sub}
            >
              {loading ? '資料讀取中...' : '下一步：產生預覽'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem' }}>第二步：預覽與確認</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                  請確認每位教師的通知內容（<span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>點擊該行</span> 可展開詳細信件預覽）。若 Email 顯示為「缺」，則無法寄送。
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>總計通知人數</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{totalEmails}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              {missingEmails > 0 && (
                <div style={{ background: '#fff1f2', color: '#be123c', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IconAlert />
                  <b>{missingEmails} 位老師資料缺漏 (無法寄送)</b>
                </div>
              )}
              <div style={{ background: '#ecfdf5', color: '#047857', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconCheck />
                <b>{totalEmails - missingEmails} 位準備就緒</b>
              </div>
            </div>

            <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
              <table className="data-table">
                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                  <tr>
                    <th width="50"></th>
                    <th width="150">教師姓名</th>
                    <th>電子郵件</th>
                    <th width="100">通知筆數</th>
                    <th width="100">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((item, idx) => (
                    <React.Fragment key={idx}>
                      <tr
                        style={{ cursor: 'pointer', background: expandedId === item.teacher_name ? '#f8fafc' : 'white' }}
                        onClick={() => toggleExpand(item.teacher_name)}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--secondary)' }}>
                          {expandedId === item.teacher_name ? '▼' : '▶'}
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.teacher_name}</td>
                        <td>
                          {item.email ? (
                            <span style={{ fontFamily: 'monospace' }}>{item.email}</span>
                          ) : (
                            <span style={{
                              background: '#ef4444', color: 'white',
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'
                            }}>缺</span>
                          )}
                        </td>
                        <td>
                          <span className="badge" style={{ background: '#e2e8f0' }}>{item.data_rows.length} 筆</span>
                        </td>
                        <td>
                          {item.email ? <span style={{ color: 'var(--success)' }}>已備妥</span> : <span style={{ color: 'var(--text-muted)' }}>略過</span>}
                        </td>
                      </tr>
                      {expandedId === item.teacher_name && (
                        <tr style={{ background: '#f8fafc' }}>
                          <td colSpan="5" style={{ padding: '0 1rem 1rem 3rem', borderBottom: '2px solid #e2e8f0' }}>
                            <div style={{
                              background: 'white',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              padding: '1.5rem',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              marginTop: '0.5rem'
                            }}>
                              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem', color: '#334155', fontWeight: 500 }}>
                                📧 信件預覽
                              </div>

                              <div style={{ marginBottom: '1rem', fontFamily: 'sans-serif' }}>
                                <strong>主旨：</strong><span>【調代課通知】{item.teacher_name} 老師</span>
                              </div>

                              <div style={{ border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '4px', color: '#333', lineHeight: '1.6' }}>
                                <p style={{ marginTop: 0 }}><strong>{item.teacher_name} 老師 您好：</strong></p>
                                <p>以下是您的調代課異動通知，請確認：</p>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                  <thead>
                                    <tr style={{ background: '#f1f5f9' }}>
                                      <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>日期</th>
                                      <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>節次</th>
                                      <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>班級</th>
                                      <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>科目</th>
                                      <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>類型</th>
                                      <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>原日期/節次</th>
                                      <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>原師/代師</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.data_rows.map((row, rIdx) => (
                                      <tr key={rIdx}>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{row.date}</td>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{row.period}</td>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{row.cls}</td>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{row.course}</td>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{row.type}</td>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: '#666' }}>
                                          {(row.original_date || row.original_period) ? `${row.original_date}(${row.original_period})` : '-'}
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{row.original_teacher} / {row.sub_teacher}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>

                                <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '1.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
                                  此信件由系統自動發送，請勿直接回覆。<br />
                                  教務處 敬啟
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Email Settings Section INSERT */}
          <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚙️ 寄件設定 (若是正式寄出請修改)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', fontWeight: 500 }}>
                  服務供應商
                </label>
                <select
                  className="input-field"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  value={envConfig.smtp_server === 'mock' ? 'mock' : envConfig.smtp_server === 'smtp.gmail.com' ? 'gmail' : 'custom'}
                  onChange={(e) => {
                    const mode = e.target.value;
                    if (mode === 'mock') {
                      setEnvConfig(prev => ({ ...prev, smtp_server: 'mock' }));
                    } else if (mode === 'gmail') {
                      setEnvConfig(prev => ({ ...prev, smtp_server: 'smtp.gmail.com', smtp_port: 587 }));
                    } else {
                      setEnvConfig(prev => ({ ...prev, smtp_server: '', smtp_port: 587 }));
                    }
                  }}
                >
                  <option value="mock">模擬測試 (不寄信)</option>
                  <option value="gmail">Gmail</option>
                  <option value="custom">自訂 SMTP</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', fontWeight: 500 }}>
                  寄件者顯示名稱
                </label>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  value={envConfig.sender_name}
                  onChange={(e) => setEnvConfig({ ...envConfig, sender_name: e.target.value })}
                  placeholder="例如：教務處"
                />
              </div>
            </div>

            {envConfig.smtp_server === 'mock' ? (
              <div style={{ background: '#fef3c7', color: '#92400e', padding: '1rem', borderRadius: '6px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                目前為「模擬模式」，系統僅會顯示執行結果，<b>不會實際寄出任何信件</b>。
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', fontWeight: 500 }}>
                    SMTP 伺服器
                  </label>
                  <input
                    type="text"
                    disabled={envConfig.smtp_server === 'smtp.gmail.com'}
                    className="input-field"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: envConfig.smtp_server === 'smtp.gmail.com' ? '#f1f5f9' : 'white' }}
                    value={envConfig.smtp_server}
                    onChange={(e) => setEnvConfig({ ...envConfig, smtp_server: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', fontWeight: 500 }}>
                    連接埠 (Port)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    value={envConfig.smtp_port}
                    onChange={(e) => setEnvConfig({ ...envConfig, smtp_port: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div style={{ alignSelf: 'end' }}>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', display: envConfig.smtp_server === 'smtp.gmail.com' ? 'block' : 'none' }}
                  >
                    取得應用程式密碼 ↗
                  </a>
                </div>

                <div style={{ gridColumn: '1 / span 3', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', fontWeight: 500 }}>
                      寄件者 Email (帳號)
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      value={envConfig.smtp_user}
                      onChange={(e) => setEnvConfig({ ...envConfig, smtp_user: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', fontWeight: 500 }}>
                      {envConfig.smtp_server === 'smtp.gmail.com' ? '應用程式密碼' : '密碼'}
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      value={envConfig.smtp_password}
                      onChange={(e) => setEnvConfig({ ...envConfig, smtp_password: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}>重新上傳</button>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={loading || (totalEmails - missingEmails) === 0}
            >
              {loading ? '寄送中...' : '確認無誤，開始寄送 ✉️'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
          <h2>寄送完成</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            作業已結束，以下是詳細執行報告。
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                {results.filter(r => r.status === 'success').length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>成功</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                {results.filter(r => r.status === 'failed').length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>失敗</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                {results.filter(r => r.status === 'no_email').length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>略過 (缺Email)</div>
            </div>
          </div>

          <div style={{ textAlign: 'left', maxHeight: '300px', overflowY: 'auto', background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
            {results.map((res, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #eee' }}>
                <span style={{ fontWeight: 500 }}>{res.teacher_name}</span>
                <span
                  style={{
                    color: res.status === 'success' ? '#10b981' : res.status === 'failed' ? '#ef4444' : '#94a3b8',
                    fontSize: '0.85rem'
                  }}
                >
                  {res.status === 'no_email' ? '缺 Email' : res.message || '寄送成功'}
                </span>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={reset}>處理下一批資料</button>
        </div>
      )}
    </div>
  );
}

export default App;
