"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { useI18n } from '@/lib/i18n/useI18n';
import AuthGuard from '@/components/AuthGuard/AuthGuard';
import { getAllDrawings, createDrawing, Drawing, logout } from '@/lib/api';
import DrawingCard from '@/components/DrawingCard/DrawingCard';
import ThemeSwitcher from "@/components/ThemeSwitcher/ThemeSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher/LanguageSwitcher";
import Icon from "@/components/Icon/Icon";
import Loader from "@/components/Loader/Loader";
import { jwtDecode } from "jwt-decode";
export default function Dashboard() {
  const { t, isLoading: i18nIsLoading } = useI18n();
  const router = useRouter();
  const [myDrawings, setMyDrawings] = useState<Drawing[]>([]);
  const [sharedDrawings, setSharedDrawings] = useState<Drawing[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDrawingTitle, setNewDrawingTitle] = useState("");
  const newTitleInputRef = useRef<HTMLInputElement>(null);
  const createFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDrawings = async () => {
      try {
        setPageLoading(true);
        setError(null);
        const response = await getAllDrawings();
        if (response.data) {
          const token = localStorage.getItem('token');
          const decodedToken = jwtDecode(token || "") as { userId: string };
          const userId = decodedToken.userId;
          const own = response.data.filter(drawing => drawing.owner_id === userId);
          const shared = response.data.filter(drawing => drawing.owner_id !== userId);
          
          setMyDrawings(own);
          setSharedDrawings(shared);
        } else if (response.error) {
          setError(response.error);
        }
      } catch (err) {
        setError("Failed to fetch drawings.");
        console.error(err);
      } finally {
        setPageLoading(false);
      }
    };

    if (!i18nIsLoading) {
      fetchDrawings();
    }
  }, [i18nIsLoading]);

  useEffect(() => {
    if (isCreating && newTitleInputRef.current) {
      newTitleInputRef.current.focus();
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (isCreating && createFormRef.current && !createFormRef.current.contains(event.target as Node)) {
        handleCancelCreate();
      }
    };

    if (isCreating) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCreating]);

  const handleStartCreate = () => {
    setIsCreating(true);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewDrawingTitle("");
    setError(null);
  };

  const handleConfirmCreate = async () => {
    if (!newDrawingTitle.trim()) {
      setError(t('dashboard.errors.titleRequired') || "Title is required.");
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      const newDrawingData = {
        title: newDrawingTitle.trim(),
        drawingData: { elements: [], appState: {} }
      };
      const response = await createDrawing(newDrawingData);
      if (response.data) {
        router.push(`/editor/${response.data._id}`);
        setIsCreating(false);
        setNewDrawingTitle("");
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      const errorText = i18nIsLoading ? "Failed to create new drawing." : (t('dashboard.errors.createFailed') || "Failed to create new drawing.");
      setError(errorText);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleConfirmCreate();
    }
    if (event.key === 'Escape') {
      handleCancelCreate();
    }
  };

  const handleDrawingRenamed = (updatedDrawing: Drawing) => {
    const userId = localStorage.getItem('userId');
    if (updatedDrawing.owner_id === userId) {
      setMyDrawings(prevDrawings => 
        prevDrawings.map(d => d._id === updatedDrawing._id ? updatedDrawing : d)
      );
    } else {
      setSharedDrawings(prevDrawings => 
        prevDrawings.map(d => d._id === updatedDrawing._id ? updatedDrawing : d)
      );
    }
  };

  const handleDrawingDeleted = (drawingId: string) => {
    setMyDrawings(prevDrawings => 
      prevDrawings.filter(d => d._id !== drawingId)
    );
    setSharedDrawings(prevDrawings => 
      prevDrawings.filter(d => d._id !== drawingId)
    );
  };

  const handleDrawingShared = (updatedDrawing: Drawing) => {
    setMyDrawings(prevDrawings => 
      prevDrawings.map(d => d._id === updatedDrawing._id ? updatedDrawing : d)
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login'); 
    } catch (error) {
      console.error("Failed to logout:", error);
      setError(t('auth.errors.logoutError') || "Logout failed. Please try again.");
    }
  };

  if (i18nIsLoading) {
    return (
      <AuthGuard>
        <div className={styles.page}>
          <div className={styles.loaderWrapper}>
            <Loader size="medium" text="Loading translations..." />
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (pageLoading) {
    return (
      <AuthGuard>
        <div className={styles.page}>
          <div className={styles.loaderWrapper}>
            <Loader size="medium" text={t('dashboard.loading') || "Loading dashboard..."} />
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>Draw</h1>
            <div className={styles.headerSwitchers}>
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
          </div>
          <div className={styles.headerRight}>
            {isSubmitting ? (
              <Loader size="small" />
            ) : !isCreating ? (
              <button onClick={handleStartCreate} className={styles.createButton}>
                <Icon name="plus" size={20} />
                {t('dashboard.newDrawingButton') || "Create New Drawing"}
              </button>
            ) : (
              <div ref={createFormRef} className={styles.inlineCreateForm}>
                <input
                  ref={newTitleInputRef}
                  type="text"
                  value={newDrawingTitle}
                  onChange={(e) => setNewDrawingTitle(e.target.value)}
                  onKeyDown={handleNewTitleKeyDown}
                  placeholder={t('dashboard.newDrawingPlaceholder') || "Enter drawing title..."}
                  className={styles.inlineInput}
                />
                <button
                  onClick={handleConfirmCreate}
                  className={`${styles.actionButton} ${styles.confirmButton}`}
                  aria-label={t('dashboard.create') || "Create"}
                >
                  <Icon name="check" size={16} />
                </button>
                <button
                  onClick={handleCancelCreate}
                  className={`${styles.actionButton} ${styles.cancelButton}`}
                  aria-label={t('dashboard.cancel') || "Cancel"}
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            )}
            <button onClick={handleLogout} className={styles.logoutButton} title={t('header.logout') || 'Log out'}>
              <Icon name="log-out" size={20} />
              <span className={styles.logoutButtonText}>{t('header.logout') || 'Log out'}</span>
            </button>
          </div>
        </header>

        <main className={styles.content}>
          {error && <p className={styles.errorText}>{error}</p>}

          {myDrawings.length === 0 && sharedDrawings.length === 0 && !error && !isCreating && (
            <p>{t('dashboard.noDrawings') || "You don't have any drawings yet. Create one!"}</p>
          )}

          {myDrawings.length > 0 && (
            <section className={styles.drawingsSection}>
              <h2 className={styles.sectionTitle}>{t('dashboard.myDrawingsTitle') || "Mis dibujos"}</h2>
              <div className={styles.drawingsGrid}>
                {myDrawings.map((drawing) => (
                  <DrawingCard 
                    owned={true}
                    key={drawing._id} 
                    drawing={drawing} 
                    onDrawingRenamed={handleDrawingRenamed}
                    onDrawingDeleted={handleDrawingDeleted}
                    onDrawingShared={handleDrawingShared}
                  />
                ))}
              </div>
            </section>
          )}

          {sharedDrawings.length > 0 && (
            <section className={styles.drawingsSection}>
              <h2 className={styles.sectionTitle}>{t('dashboard.sharedDrawingsTitle') || "Compartidos conmigo"}</h2>
              <div className={styles.drawingsGrid}>
                {sharedDrawings.map((drawing) => (
                  <DrawingCard 
                    owned={false}
                    key={drawing._id} 
                    drawing={drawing} 
                    onDrawingRenamed={handleDrawingRenamed}
                    onDrawingDeleted={handleDrawingDeleted}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
