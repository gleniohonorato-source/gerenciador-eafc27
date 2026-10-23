import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CalendarImportPreview, CareerSummary, FixtureSummary, PlayerProfileInput, PlayerSummary } from './career-api';

export default function App() {
  const [careers, setCareers] = useState<readonly CareerSummary[]>([]);
  const [name, setName] = useState('');
  const [season, setSeason] = useState('2026/27');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeCareer, setActiveCareer] = useState<CareerSummary | null>(null);
  const [fixtures, setFixtures] = useState<readonly FixtureSummary[]>([]);
  const [players, setPlayers] = useState<readonly PlayerSummary[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSummary | null>(null);
  const [editingPlayer, setEditingPlayer] = useState(false);
  const [playerDraft, setPlayerDraft] = useState<PlayerProfileInput | null>(null);
  const previousFocusRef = useRef<(() => void) | null>(null);
  const [fixturesLoadedFor, setFixturesLoadedFor] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [importPreview, setImportPreview] = useState<CalendarImportPreview | null>(null);
  const [selectionToken, setSelectionToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const playerProfileCloseRef = useRef<{ focus: () => void } | null>(null);

  useEffect(() => {
    if (!selectedPlayer) return;
    playerProfileCloseRef.current?.focus();
  }, [selectedPlayer]);

  function openPlayerProfile(player: PlayerSummary, focusTarget: { focus: () => void } | null) {
    previousFocusRef.current = focusTarget ? () => focusTarget.focus() : null;
    setSelectedPlayer(player);
  }

  function closePlayerProfile() {
    if (busy) return;
    setSelectedPlayer(null);
    setEditingPlayer(false);
    setPlayerDraft(null);
    previousFocusRef.current?.();
  }

  function beginPlayerEdit() {
    if (!selectedPlayer) return;
    setPlayerDraft({
      name: selectedPlayer.name,
      birthDate: selectedPlayer.birthDate,
      overall: selectedPlayer.overall,
      potential: selectedPlayer.potential,
      heightCm: selectedPlayer.heightCm,
      weightKg: selectedPlayer.weightKg,
    });
    setEditingPlayer(true);
  }

  function updatePlayerDraft(field: keyof PlayerProfileInput, value: string) {
    if (!playerDraft) return;
    if (field === 'overall' || field === 'potential' || field === 'heightCm' || field === 'weightKg') {
      const numericValue = value.trim() === '' ? null : Number(value);
      setPlayerDraft({ ...playerDraft, [field]: numericValue });
      return;
    }
    if (field === 'birthDate') {
      setPlayerDraft({ ...playerDraft, birthDate: value.trim() === '' ? null : value });
      return;
    }
    setPlayerDraft({ ...playerDraft, name: value });
  }

  async function savePlayerDraft() {
    if (!activeCareer || !selectedPlayer || !playerDraft) return;
    const confirmed = window.confirm(`Salvar as alterações de ${selectedPlayer.name}?`);
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await window.careerDesktop.updatePlayer(activeCareer.id, selectedPlayer.id, playerDraft);
      const refreshedPlayers = await window.careerDesktop.listPlayers(activeCareer.id);
      setPlayers(refreshedPlayers);
      const updatedProfile = refreshedPlayers.find((player) => player.id === selectedPlayer.id) ?? null;
      setSelectedPlayer(updatedProfile);
      if (updatedProfile) {
        setPlayerDraft({
          name: updatedProfile.name,
          birthDate: updatedProfile.birthDate,
          overall: updatedProfile.overall,
          potential: updatedProfile.potential,
          heightCm: updatedProfile.heightCm,
          weightKg: updatedProfile.weightKg,
        });
      }
      setEditingPlayer(false);
      setPlayerDraft(null);
      setNotice('Alterações do jogador salvas. A origem original foi preservada.');
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  function cancelPlayerEdit() {
    setEditingPlayer(false);
    setPlayerDraft(null);
  }

  function handleProfileKeyDown(event: { key: string }) {
    if (event.key === 'Escape' && !busy) closePlayerProfile();
  }

  useEffect(() => {
    if (typeof window.careerDesktop?.listCareers !== 'function') {
      setError('Ponte com o processo principal indisponível. Verifique o preload.');
      return;
    }
    window.careerDesktop.listCareers().then(setCareers).catch((cause: unknown) => setError(messageOf(cause)));
    window.careerDesktop.appVersion().then(setAppVersion).catch((cause: unknown) => setError(messageOf(cause)));
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await window.careerDesktop.createCareer({ name, currentSeason: season });
      setCareers((current) => [...current, created]);
      setActiveCareer(created);
      setSelectedPlayer(null);
      setFixtures([]);
      setPlayers([]);
      setFixturesLoadedFor(created.id);
      setNotice(`Carreira criada e aberta: ${created.name} · ${created.currentSeason}`);
      setImportPreview(null);
      setName('');
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenCareer(id: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    setLoadingFixtures(true);
    try {
      const [opened, savedFixtures, savedPlayers] = await Promise.all([
        window.careerDesktop.openCareer(id),
        window.careerDesktop.listFixtures(id),
        window.careerDesktop.listPlayers(id),
      ]);
      setActiveCareer(opened);
      setSelectedPlayer(null);
      setImportPreview(null);
      setFixtures(savedFixtures);
      setPlayers(savedPlayers);
      setFixturesLoadedFor(opened.id);
      setNotice(`Carreira aberta: ${opened.name} · ${opened.currentSeason}`);
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setLoadingFixtures(false);
      setBusy(false);
    }
  }

  async function handleSelectCalendarImport() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const selected = await window.careerDesktop.selectCalendarImportFile();
      if (selected.canceled) return;
      const activeSelectionToken = selected.token;
      setSelectionToken(activeSelectionToken);
      let preview: CalendarImportPreview;
      try {
        preview = await window.careerDesktop.previewCalendarImport(selected.token);
      } catch (cause: unknown) {
        await window.careerDesktop.cancelCalendarImport(activeSelectionToken, 'selection').catch(() => undefined);
        setSelectionToken(null);
        throw cause;
      }
      setSelectionToken(null);
      setImportPreview(preview);
      setNotice(`Prévia pronta: ${preview.counts.fixtures} partidas encontradas.`);
    } catch (cause: unknown) {
      setSelectionToken(null);
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmCalendarImport() {
    if (!importPreview || !activeCareer) return;
    if (importPreview.career.id !== activeCareer.id) {
      setError('O arquivo pertence a outra carreira. Abra essa carreira antes de importar.');
      return;
    }
    if (importPreview.conflicts.length > 0 || importPreview.issues.some((issue) => issue.severity === 'ERROR')) {
      setError('Resolva os erros ou conflitos antes de confirmar a importação.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const imported = await window.careerDesktop.confirmCalendarImport(importPreview.token, activeCareer.id);
      const savedPlayers = await window.careerDesktop.listPlayers(activeCareer.id);
      setFixtures(imported.fixtures);
      setPlayers(savedPlayers);
      setFixturesLoadedFor(activeCareer.id);
      setImportPreview(null);
      setNotice(`${importPreview.counts.fixtures} partidas e ${importPreview.counts.players} jogadores importados para ${activeCareer.name}.`);
    } catch (cause: unknown) {
      setImportPreview(null);
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelCalendarImport() {
    if (importPreview) await window.careerDesktop.cancelCalendarImport(importPreview.token, 'preview').catch(() => undefined);
    if (selectionToken) await window.careerDesktop.cancelCalendarImport(selectionToken, 'selection').catch(() => undefined);
    setImportPreview(null);
    setSelectionToken(null);
  }

  async function handleCreateBackup() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await window.careerDesktop.createBackup();
      if (result.canceled) return;
      setNotice(`Backup criado: ${result.fileName} · ${result.manifest.sizeBytes} bytes`);
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreBackup() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const selection = await window.careerDesktop.selectBackupRestore();
      if (selection.canceled) return;
      const accepted = window.confirm(
        `Restaurar o backup “${selection.fileName}” criado em ${new Date(selection.createdAt).toLocaleString()}?\n\n` +
        'A base atual será substituída. Uma cópia anterior será mantida na pasta de dados do aplicativo.',
      );
      if (!accepted) return;
      await window.careerDesktop.confirmBackupRestore(selection.token, true);
      const restoredCareers = await window.careerDesktop.listCareers();
      setCareers(restoredCareers);
      setActiveCareer(null);
      setSelectedPlayer(null);
      setFixtures([]);
      setPlayers([]);
      setFixturesLoadedFor(null);
      setNotice('Backup restaurado. Selecione uma carreira para abri-la.');
    } catch (cause: unknown) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <aside className="rail" aria-label="Navegação principal">
        <div className="crest" aria-hidden="true">G</div>
        <div className="rail-mark" aria-hidden="true">27</div>
      </aside>
      <section className="workspace" aria-labelledby="page-title">
        <header className="topbar">
          <span className="brand">Gerenciador de carreira</span>
          <span className="build-tag">{appVersion ? `Versão ${appVersion}` : 'Carreiras salvas'}</span>
        </header>
        <div className="welcome">
          <p className="eyebrow">Pré-temporada</p>
          <h1 id="page-title">Uma carreira,<br />do seu jeito.</h1>
          <form className="career-form" onSubmit={handleCreate}>
            <label>
              Nome da carreira
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
            </label>
            <label>
              Temporada
              <input value={season} onChange={(event) => setSeason(event.target.value)} pattern="\d{4}/\d{2}" required />
            </label>
            <button type="submit" disabled={busy}>Criar carreira</button>
          </form>

          <div className="backup-actions" aria-label="Proteção de dados">
            <button type="button" disabled={busy} onClick={() => void handleCreateBackup()}>Criar backup</button>
            <button type="button" disabled={busy} onClick={() => void handleRestoreBackup()}>Restaurar backup</button>
          </div>

          {error ? <p role="alert" className="error">{error}</p> : null}
          {notice ? <p role="status" className="notice">{notice}</p> : null}

          {activeCareer ? (
            <section className="active-career" aria-live="polite" aria-label="Carreira aberta">
              <span className="active-career-label">Carreira aberta</span>
              <strong>{activeCareer.name}</strong>
              <span>Temporada {activeCareer.currentSeason}</span>
            </section>
          ) : null}

          {importPreview ? (
            <section className="import-preview" aria-labelledby="import-preview-title">
              <h2 id="import-preview-title">Revisar calendário importado</h2>
              <p>Arquivo: {importPreview.fileName}</p>
              <p>Carreira: {importPreview.career.name} · {importPreview.career.currentSeason}</p>
              <p>Encontrados: {importPreview.counts.clubs} clubes, {importPreview.counts.players} jogadores e {importPreview.counts.fixtures} partidas.</p>
              {importPreview.issues.map((issue) => (
                <p key={`${issue.code}:${issue.path}`} className={issue.severity === 'ERROR' ? 'error' : 'notice'}>
                  {issue.severity === 'ERROR' ? 'Erro' : 'Aviso'}: {issue.message}
                </p>
              ))}
              {importPreview.conflicts.length > 0 ? (
                <div className="error" role="alert">
                  <strong>Há {importPreview.conflicts.length} conflito(s); esta importação não pode ser confirmada.</strong>
                  {importPreview.conflicts.slice(0, 5).map((conflict) => <p key={`${conflict.entityType}:${conflict.identity}`}>{conflict.entityType}: {conflict.message}</p>)}
                </div>
              ) : null}
              {activeCareer && importPreview.career.id !== activeCareer.id ? (
                <p className="error" role="alert">Abra a carreira {importPreview.career.name} antes de importar este arquivo.</p>
              ) : null}
              <div className="backup-actions">
                <button type="button" disabled={busy} onClick={() => void handleCancelCalendarImport()}>Cancelar</button>
                <button
                  type="button"
                  disabled={busy || !activeCareer || importPreview.career.id !== activeCareer.id || importPreview.conflicts.length > 0 || importPreview.issues.some((issue) => issue.severity === 'ERROR')}
                  onClick={() => void handleConfirmCalendarImport()}
                >Confirmar importação</button>
              </div>
            </section>
          ) : null}

          {activeCareer && fixturesLoadedFor === activeCareer.id ? (
            <section className="fixtures" aria-label="Calendário da carreira">
              <div className="fixtures-heading">
                <h2>Calendário · {activeCareer.currentSeason}</h2>
                <button type="button" className="import-calendar-button" disabled={busy} onClick={() => void handleSelectCalendarImport()}>
                  Importar calendário
                </button>
              </div>
              {loadingFixtures ? <p className="fixtures-empty">Carregando calendário…</p> : null}
              {!loadingFixtures && fixtures.length === 0 ? (
                <p className="fixtures-empty">
                  Nenhum jogo salvo nesta carreira. Importe um calendário para ver as partidas aqui.
                </p>
              ) : !loadingFixtures ? (
                <ol className="fixture-list">
                  {fixtures.map((fixture) => (
                    <li key={fixture.id}>
                      <time dateTime={fixture.kickoffAt}>{formatKickoff(fixture.kickoffAt, fixture.timeZone)}</time>
                      <span>{fixture.homeClubName} × {fixture.awayClubName}</span>
                      <span className="fixture-status">{fixtureStatusLabel(fixture.status)}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          ) : null}

          {activeCareer && fixturesLoadedFor === activeCareer.id && !loadingFixtures ? (
            <section className="squad" aria-label="Elenco da carreira">
              <h2>Elenco · {players.length} {players.length === 1 ? 'jogador' : 'jogadores'}</h2>
              {players.length === 0 ? (
                <p className="fixtures-empty">
                  Nenhum jogador salvo nesta carreira. Importe um arquivo que inclua o elenco para vê-lo aqui.
                </p>
              ) : (
                <ul className="player-list">
                  {players.map((player) => (
                    <li key={player.id}>
                      <button
                        type="button"
                        className="player-select"
                        aria-haspopup="dialog"
                        aria-label={`Ver perfil de ${player.name}`}
                        onClick={(event) => {
                          const trigger = event.currentTarget as { focus: () => void };
                          openPlayerProfile(player, trigger);
                        }}
                      >
                        <span className="player-name">{player.name}</span>
                        <span className="player-club">{player.clubName ?? 'Sem clube'}</span>
                        <span className="player-ratings">{player.overall ?? '—'} / {player.potential ?? '—'}</span>
                        <span className="player-age">{player.age === null ? '—' : `${player.age} anos`}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {selectedPlayer ? (
            <div className="player-profile-backdrop" onKeyDown={handleProfileKeyDown} onMouseDown={(event) => {
              if (event.target === event.currentTarget) closePlayerProfile();
            }}>
              <aside className="player-profile" role="dialog" aria-modal="true" aria-labelledby="player-profile-title" aria-describedby="player-profile-description">
                <header className="player-profile-header">
                  <div>
                    <p className="eyebrow">Perfil do jogador</p>
                    <h2 id="player-profile-title">{selectedPlayer.name}</h2>
                    <p className="player-profile-club">{selectedPlayer.clubName ?? 'Sem clube'}</p>
                  </div>
                  <button ref={(element) => { playerProfileCloseRef.current = element ? { focus: () => element.focus() } : null; }} type="button" className="player-profile-close" aria-label="Fechar perfil" onClick={closePlayerProfile}>Fechar</button>
                </header>

                <p id="player-profile-description" className="visually-hidden">Detalhes do jogador e origem dos dados.</p>
                <div className="player-profile-scroll">
                {editingPlayer && playerDraft ? (
                  <form className="player-edit-form" onSubmit={(event) => { event.preventDefault(); void savePlayerDraft(); }}>
                    <label>Nome
                      <input value={playerDraft.name} maxLength={100} required onChange={(event) => updatePlayerDraft('name', event.target.value)} />
                    </label>
                    <label>Data de nascimento
                      <input type="date" value={playerDraft.birthDate ?? ''} onChange={(event) => updatePlayerDraft('birthDate', event.target.value)} />
                    </label>
                    <div className="player-edit-grid">
                      <label>Overall
                        <input type="number" min="0" max="100" value={playerDraft.overall ?? ''} onChange={(event) => updatePlayerDraft('overall', event.target.value)} />
                      </label>
                      <label>Potencial
                        <input type="number" min="0" max="100" value={playerDraft.potential ?? ''} onChange={(event) => updatePlayerDraft('potential', event.target.value)} />
                      </label>
                      <label>Altura (cm)
                        <input type="number" min="1" max="250" value={playerDraft.heightCm ?? ''} onChange={(event) => updatePlayerDraft('heightCm', event.target.value)} />
                      </label>
                      <label>Peso (kg)
                        <input type="number" min="1" max="300" value={playerDraft.weightKg ?? ''} onChange={(event) => updatePlayerDraft('weightKg', event.target.value)} />
                      </label>
                    </div>
                    <div className="player-edit-actions">
                      <button type="button" disabled={busy} onClick={cancelPlayerEdit}>Cancelar</button>
                      <button type="submit" disabled={busy || !playerDraft.name.trim()}>Salvar alterações</button>
                    </div>
                    <p className="player-edit-note">Ao salvar, a alteração fica registrada como inserida pelo usuário. A origem anterior é preservada.</p>
                  </form>
                ) : (
                  <>
                    <div className="player-profile-ratings" aria-label="Avaliações">
                      <div><span>Overall</span><strong>{selectedPlayer.overall ?? '—'}</strong></div>
                      <div><span>Potencial</span><strong>{selectedPlayer.potential ?? '—'}</strong></div>
                    </div>
                    <dl className="player-profile-facts">
                      <div><dt>Idade</dt><dd>{selectedPlayer.age === null ? 'Não informada' : `${selectedPlayer.age} anos`}</dd></div>
                      <div><dt>Nascimento</dt><dd>{selectedPlayer.birthDate ? formatBirthDate(selectedPlayer.birthDate) : 'Não informado'}</dd></div>
                      <div><dt>Altura</dt><dd>{selectedPlayer.heightCm === null ? 'Não informada' : `${selectedPlayer.heightCm} cm`}</dd></div>
                      <div><dt>Peso</dt><dd>{selectedPlayer.weightKg === null ? 'Não informado' : `${selectedPlayer.weightKg} kg`}</dd></div>
                    </dl>
                    <footer className="player-profile-provenance">
                      <h3>Origem dos dados</h3>
                      <p>{provenanceLabel(selectedPlayer.provenanceKind)} · {selectedPlayer.provenanceSource}</p>
                      <time dateTime={selectedPlayer.provenanceRecordedAt}>Registrado em {formatBirthDate(selectedPlayer.provenanceRecordedAt.slice(0, 10))}</time>
                      {selectedPlayer.originalProvenanceKind ? <p>Origem anterior: {provenanceLabel(selectedPlayer.originalProvenanceKind)} · {selectedPlayer.originalProvenanceSource}{selectedPlayer.originalProvenanceRecordedAt ? ` · ${formatBirthDate(selectedPlayer.originalProvenanceRecordedAt.slice(0, 10))}` : ''}</p> : null}
                    </footer>
                  </>
                )}
                </div>
                {!editingPlayer ? <button type="button" className="player-edit-start" onClick={beginPlayerEdit}>Editar jogador</button> : null}
              </aside>
            </div>
          ) : null}

          <ul className="career-list" aria-label="Carreiras salvas">
            {careers.length === 0 ? <li>Nenhuma carreira salva</li> : null}
            {careers.map((career) => (
              <li key={career.id}>
                <button
                  type="button"
                  className={`career-open${activeCareer?.id === career.id ? ' is-active' : ''}`}
                  disabled={busy}
                  aria-current={activeCareer?.id === career.id ? 'page' : undefined}
                  onClick={() => void handleOpenCareer(career.id)}
                >
                  <span>{career.name}</span><span className="career-season">{career.currentSeason}</span>
                  <span className="career-open-label">{activeCareer?.id === career.id ? 'Aberta' : 'Abrir carreira'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <footer className="footer">
          <span>Modo seguro · sem conexão ao jogo</span>
          <span>EA FC 27 · ferramenta independente</span>
        </footer>
      </section>
    </main>
  );
}

function formatKickoff(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date);
  }
}

function fixtureStatusLabel(status: FixtureSummary['status']): string {
  switch (status) {
    case 'SCHEDULED': return 'Agendado';
    case 'COMPLETED': return 'Concluído';
    case 'POSTPONED': return 'Adiado';
    case 'CANCELLED': return 'Cancelado';
  }
}

function formatBirthDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}

function provenanceLabel(value: string): string {
  switch (value) {
    case 'USER_ENTERED': return 'Inserido pelo usuário';
    case 'IMPORTED_EXTERNAL': return 'Importado de fonte externa';
    case 'READ_FROM_GAME': return 'Lido de jogo';
    case 'SIMULATED': return 'Gerado por simulação';
    case 'DERIVED': return 'Derivado de outros dados';
    default: return 'Origem não classificada';
  }
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Erro inesperado.';
}
