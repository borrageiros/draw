"use client";
import styles from "./page.module.css";
import dynamic from "next/dynamic";
import { useRef, useState, useEffect, useCallback, use, useMemo } from "react";
import "@excalidraw/excalidraw/index.css";
import { MainMenu } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI, Collaborator, SocketId } from "@excalidraw/excalidraw/types";
import { useRouter } from "next/navigation";
import { useHandleLibrary } from "@excalidraw/excalidraw";

import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { useI18n } from '@/lib/i18n/useI18n';
import Icon from '@/components/Icon/Icon';
import DynamicAuthGuard from '@/components/AuthGuard/DynamicAuthGuard';
import { getOneDrawing, updateDrawing, UpdateDrawingRequest } from '@/lib/api';
import { webSocketService } from '@/lib/websocket';
import Loader from '@/components/Loader/Loader';
import { getUser } from "@/components/AuthGuard/AuthGuard";

const ExcalidrawComponent = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const throttle = <T extends (...args: any[]) => void>(func: T, limit: number) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debounce = <T extends (...args: any[]) => void>(func: T, delay: number) => {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

export default function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { username } = getUser();
  const resolvedParams = use(params);
  const { t, isLoading } = useI18n();
  const excalidrawWrapperRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLanguage();
  const [isClient, setIsClient] = useState(false);
  const drawingIdRef = useRef<string | null>(null);
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const router = useRouter();
  const isUpdatingFromRemote = useRef(false);
  const [drawingName, setDrawingName] = useState<string | null>(null);
  const clientId = useMemo(() => Math.random().toString(36).substring(2, 9), []);
  const [collaborators, setCollaborators] = useState<Map<SocketId, Collaborator>>(new Map());

  useHandleLibrary({ excalidrawAPI });

  const [initialData, setInitialData] = useState<{
    elements: readonly ExcalidrawElement[];
    appState?: Partial<AppState>;
    files?: BinaryFiles;
  } | null>(null);
  const [isLoadingDrawing, setIsLoadingDrawing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initialElementsRef = useRef<readonly ExcalidrawElement[] | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  // Effect for WebSocket connection and message handling
  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    const handleMessage = (message: string) => {
      try {
        const data = JSON.parse(message);
        const { drawingId } = data;
        if (drawingId !== drawingIdRef.current) return;

        switch (data.type) {
          case 'drawingUpdate':
            if (excalidrawRef.current) {
              isUpdatingFromRemote.current = true;
              excalidrawRef.current.updateScene({
                elements: data.payload.elements,
                appState: data.payload.appState,
              });
            }
            break;
          case 'pointerUpdate': {
            if (data.clientId === clientId) return;
            const { pointer, username } = data;
            setCollaborators(prev => {
              const newCollaborators = new Map(prev);
              const collaboratorId = data.clientId as SocketId;
              if (pointer) {
                newCollaborators.set(collaboratorId, { pointer, username });
              } else {
                newCollaborators.delete(collaboratorId);
              }
              return newCollaborators;
            });
            break;
          }
          case 'userLeave': {
            setCollaborators(prev => {
              const newCollaborators = new Map(prev);
              newCollaborators.delete(data.clientId as SocketId);
              return newCollaborators;
            });
            break;
          }
          case 'userEnter': {
            const { clientId: newClientId, username } = data;
            if (newClientId === clientId) return;
            setCollaborators(prev => {
              const newCollaborators = new Map(prev);
              newCollaborators.set(newClientId as SocketId, { username });
              return newCollaborators;
            });
            break;
          }
          case 'existingUsers': {
            const { users } = data;
            setCollaborators(prev => {
              const newCollaborators = new Map(prev);
              users.forEach((u: { clientId: string, username: string }) => {
                if (u.clientId !== clientId) {
                  newCollaborators.set(u.clientId as SocketId, { username: u.username });
                }
              });
              return newCollaborators;
            });
            break;
          }
          default:
            break;
        }
      } catch (error) {
        console.error("Failed to process WebSocket message", error);
      }
    };

    webSocketService.onConnectionChange(handleConnectionChange);
    webSocketService.onMessage(handleMessage);
    webSocketService.connect();

    return () => {
      webSocketService.removeConnectionHandler(handleConnectionChange);
      webSocketService.removeMessageHandler(handleMessage);
    };
  }, [clientId]);

  // Effect for joining the drawing room once connected and drawingId is available
  useEffect(() => {
    const drawingId = resolvedParams.id;
    if (isConnected && drawingId && username) {
      drawingIdRef.current = drawingId;
      webSocketService.sendMessage(JSON.stringify({ type: 'join', drawingId, clientId, username }));
    }
  }, [isConnected, resolvedParams.id, clientId, username]);

  const saveDrawing = useCallback((elements: readonly ExcalidrawElement[], appState: AppState) => {
    if (!drawingIdRef.current) return Promise.resolve();

    const relevantAppState: Partial<AppState> = {
      viewBackgroundColor: appState.viewBackgroundColor,
      currentItemFontFamily: appState.currentItemFontFamily,
      currentItemRoughness: appState.currentItemRoughness,
      currentItemStrokeColor: appState.currentItemStrokeColor,
      currentItemStrokeStyle: appState.currentItemStrokeStyle,
      currentItemStrokeWidth: appState.currentItemStrokeWidth,
      currentItemTextAlign: appState.currentItemTextAlign,
      name: appState.name,
      gridSize: appState.gridSize,
    };

    const payload: UpdateDrawingRequest = {
      drawingData: { elements, appState: relevantAppState, files: {} },
    };
    
    return updateDrawing(drawingIdRef.current, payload);
  }, []);

  const throttledSave = useMemo(() => debounce(saveDrawing, 2000), [saveDrawing]);

  const saveOnExit = useCallback(async () => {
    if (!drawingIdRef.current || !excalidrawRef.current) return;

    const elements = excalidrawRef.current.getSceneElements();
    const appState = excalidrawRef.current.getAppState();

    const relevantAppState: Partial<AppState> = {
      viewBackgroundColor: appState.viewBackgroundColor,
      currentItemFontFamily: appState.currentItemFontFamily,
      currentItemRoughness: appState.currentItemRoughness,
      currentItemStrokeColor: appState.currentItemStrokeColor,
      currentItemStrokeStyle: appState.currentItemStrokeStyle,
      currentItemStrokeWidth: appState.currentItemStrokeWidth,
      currentItemTextAlign: appState.currentItemTextAlign,
      name: appState.name,
      gridSize: appState.gridSize,
    };

    const payload: UpdateDrawingRequest = {
      drawingData: { elements, appState: relevantAppState, files: {} },
    };
    
    try {
      await updateDrawing(drawingIdRef.current, payload);
    } catch (err) {
      console.error("Save on exit failed:", err);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !resolvedParams.id) {
      if (isClient && !resolvedParams.id) setIsLoadingDrawing(false);
      return;
    }
    drawingIdRef.current = resolvedParams.id;

    const fetchDrawing = async () => {
      if (!drawingIdRef.current) return;
      setIsLoadingDrawing(true);
      setLoadError(null);
      try {
        const response = await getOneDrawing(drawingIdRef.current);
        setDrawingName(response.data?.title || null);
        if (response.data && response.data.data) {
          const drawingContent = response.data.data as { elements: ExcalidrawElement[], appState: Partial<AppState>, files: BinaryFiles };
          if (drawingContent && Array.isArray(drawingContent.elements)) {
            initialElementsRef.current = drawingContent.elements;
            setInitialData({
              elements: drawingContent.elements,
              appState: drawingContent.appState || {},
              files: drawingContent.files || {}
            });
          } else {
            initialElementsRef.current = [];
            setInitialData({
              elements: [],
              appState: {}
            });
          }
        } else if (response.error) {
          setLoadError(response.error);
          console.error("Error fetching drawing:", response.error);
        } else {
           initialElementsRef.current = [];
           setInitialData({
            elements: [],
            appState: {}
          });
        }
      } catch (err) {
        setLoadError(t('editor.errors.loadFailedSimple') || "Failed to fetch drawing data.");
        console.error("Fetch drawing error:", err);
      } finally {
        setIsLoadingDrawing(false);
      }
    };

    fetchDrawing();
  }, [isClient, theme, t, resolvedParams.id]);

  useEffect(() => {
    if (excalidrawRef.current) {
      excalidrawRef.current.updateScene({ collaborators });
    }
  }, [collaborators]);

  const broadcastDrawing = useCallback((elements: readonly ExcalidrawElement[], appState: AppState) => {
    if (webSocketService.isConnected() && drawingIdRef.current) {
      const payload = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
          currentItemRoughness: appState.currentItemRoughness,
          currentItemStrokeColor: appState.currentItemStrokeColor,
          currentItemStrokeStyle: appState.currentItemStrokeStyle,
          currentItemStrokeWidth: appState.currentItemStrokeWidth,
          currentItemTextAlign: appState.currentItemTextAlign,
          name: appState.name,
          gridSize: appState.gridSize,
        },
      };
      webSocketService.sendMessage(JSON.stringify({
        type: 'drawingUpdate',
        drawingId: drawingIdRef.current,
        payload
      }));
    }
  }, []);
  
  const throttledBroadcast = useMemo(() => debounce(broadcastDrawing, 200), [broadcastDrawing]);

  const onPointerUpdate = useCallback((payload: {
    pointer: { x: number; y: number };
    button: "down" | "up";
    pointersMap: Map<number, Readonly<{ x: number; y: number }>>;
  }) => {
    if (webSocketService.isConnected() && drawingIdRef.current) {
      webSocketService.sendMessage(JSON.stringify({
        type: 'pointerUpdate',
        drawingId: drawingIdRef.current,
        clientId: clientId,
        pointer: payload.pointer,
        button: payload.button,
      }));
    }
  }, [clientId]);

  const throttledOnPointerUpdate = useMemo(() => throttle(onPointerUpdate, 20), [onPointerUpdate]);

  const handleThemeChange = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const handleLanguageChange = useCallback(() => {
    const newLocale = locale === 'es' ? 'en' : 'es';
    setLocale(newLocale);
  }, [locale, setLocale]);
  
  const handleHomeClick = useCallback(async () => {
    await saveOnExit();
    router.push("/dashboard");
  }, [router, saveOnExit]);

  const getMenuItemText = useCallback((key: string, defaultText?: string) => {
    if (isLoading || !t) {
      return defaultText || key;
    }
    const translatedText = t(key);
    if (translatedText === key && defaultText) {
      return defaultText;
    }
    return translatedText;
  }, [t, isLoading]);

  const onExcalidrawChange = useCallback((elements: readonly ExcalidrawElement[], appState: AppState) => {
    if (isUpdatingFromRemote.current) {
      isUpdatingFromRemote.current = false;
      initialElementsRef.current = elements;
      return;
    }
    
    throttledBroadcast(elements, appState);
    throttledSave(elements, appState);
  }, [throttledBroadcast, throttledSave]);

  return (
    <DynamicAuthGuard>
    <div className={styles.page}>
      {isLoadingDrawing && (
        <div className={styles.loadingOverlay}>
          <Loader size="medium" text={getMenuItemText('editor.loadingDrawing', "Loading drawing...")} />
        </div>
      )}
      {loadError && <div className={styles.errorOverlay}><p>{loadError}</p></div>}
      <title>{`Editor - ${drawingName || 'Drawing'}`}</title>
      <div ref={excalidrawWrapperRef} className={`${styles.excalidrawContainer} ${isLoadingDrawing || loadError ? styles.hidden : ''}`}>
        {isClient && initialData && (
          <ExcalidrawComponent
            excalidrawAPI={(api) => {
              excalidrawRef.current = api;
              setExcalidrawAPI(api);
            }}
            initialData={initialData}
            theme={theme}
            langCode={locale === 'es' ? 'es-ES' : 'en-US'}
            onChange={onExcalidrawChange}
            onPointerUpdate={throttledOnPointerUpdate}
            renderTopRightUI={() => (
              <button 
                className={styles.homeButton}
                onClick={handleHomeClick}
                title={getMenuItemText('editor.homePage', 'Home Page')}
              >
                <Icon name="home" />
              </button>
            )}
          >
            <MainMenu>
              <MainMenu.DefaultItems.LoadScene />
              <MainMenu.DefaultItems.Export />
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.Separator />
              
              <MainMenu.Item onSelect={handleThemeChange}>
                {theme === 'dark' 
                  ? <><Icon name='moon' /> {getMenuItemText('theme.dark', 'Dark mode')}</> 
                  : <><Icon name='sun' /> {getMenuItemText('theme.light', 'Light mode')}</>}
              </MainMenu.Item>
              
              <MainMenu.Item onSelect={handleLanguageChange}>
                {locale === 'en'
                  ? <><Icon name='flag-en' viewBox="0 0 60 30" /> {getMenuItemText('language.en', 'English')}</> 
                  : <><Icon name='flag-es' viewBox="0 0 300 200" /> {getMenuItemText('language.es', 'Spanish')}</>}
              </MainMenu.Item>
              
              <MainMenu.Separator />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
            </MainMenu>
          </ExcalidrawComponent>
        )}
      </div>
    </div>
    </DynamicAuthGuard>
  );
}
