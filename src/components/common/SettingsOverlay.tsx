import React, { useRef, useState } from 'react';
import { ImportExportService } from '../../services/ImportExportService';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';

interface SettingsOverlayProps {
    onClose: () => void;
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ onClose }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [msg, setMsg] = useState('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    // Escape key handling
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // ... (rest of the file constants)

    const handleExport = async () => {
        try {
            const json = await ImportExportService.exportData();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hakisiro_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setMsg("Export started.");
        } catch (e: any) {
            alert("Export failed: " + e.message);
        }
    };

    const handleImportClick = () => {
        setMsg('');
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingFile(file);
        // Clear input so same file can be selected again if cancelled
        e.target.value = '';
    };

    const confirmImport = async () => {
        if (!pendingFile) return;
        try {
            const text = await pendingFile.text();
            await ImportExportService.importData(text);
            setMsg("Import successful! Reloading...");
            setPendingFile(null);
            setTimeout(() => window.location.reload(), 1000);
        } catch (err: any) {
            setMsg("Import failed: " + err.message);
            setPendingFile(null);
        }
    };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onClick={onClose} // Backdrop click
        >
            <div
                style={{ width: '100%', maxWidth: '400px', margin: 16 }}
                onClick={e => e.stopPropagation()} // Prevent closing when clicking content
            >
                <Panel title="Settings / Data" actions={<Button onClick={onClose}>Close</Button>}>
                    <div className="flex-col" style={{ padding: 16 }}>
                        <div className="text-dim" style={{ marginBottom: 16 }}>
                            Backup your data or restore from a previous backup.
                        </div>

                        {!pendingFile ? (
                            <>
                                <Button onClick={handleExport} className="full-width">Export Data (JSON)</Button>
                                <div style={{ height: 16 }} />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept=".json"
                                    onChange={handleFileChange}
                                />
                                <Button onClick={handleImportClick} className="full-width">Import Data (JSON)</Button>
                            </>
                        ) : (
                            <div style={{ border: '1px solid var(--accent-color)', padding: 16, background: '#331111' }}>
                                <div style={{ fontWeight: 'bold', color: '#ff4444', marginBottom: 8 }}>WARNING</div>
                                <div style={{ marginBottom: 16 }}>
                                    Importing <b>{pendingFile.name}</b> will OVERWRITE all current data.
                                    <br /><br />
                                    Are you sure?
                                </div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <Button onClick={confirmImport} style={{ flex: 1, borderColor: '#ff4444', color: '#ff4444' }}>YES, OVERWRITE</Button>
                                    <Button onClick={() => setPendingFile(null)} style={{ flex: 1 }}>Cancel</Button>
                                </div>
                            </div>
                        )}

                        {msg && <div style={{ marginTop: 16, color: 'var(--accent-color)' }}>{msg}</div>}
                    </div>
                </Panel>
            </div>
        </div>
    );
};
