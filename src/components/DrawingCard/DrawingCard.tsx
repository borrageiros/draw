'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Drawing,
  updateDrawing as apiUpdateDrawing,
  deleteDrawing as apiDeleteDrawing,
  getUsers as apiGetUsers,
  shareDrawingWithUser as apiShareDrawing,
  unshareDrawingWithUser as apiUnshareDrawing,
} from '@/lib/api';
import { IUser } from '@/models/User';
import styles from './DrawingCard.module.css';
import { useI18n } from '@/lib/i18n/useI18n';
import Icon from '@/components/Icon/Icon';
import Modal from '@/components/Modal/Modal';

interface DrawingCardProps {
  drawing: Drawing;
  owned: boolean;
  onDrawingRenamed: (updatedDrawing: Drawing) => void;
  onDrawingDeleted: (drawingId: string) => void;
  onDrawingShared?: (updatedDrawing: Drawing) => void;
}

export default function DrawingCard({
  drawing,
  owned,
  onDrawingRenamed,
  onDrawingDeleted,
  onDrawingShared,
}: DrawingCardProps) {
  const { t, isLoading: i18nCardIsLoading } = useI18n();

  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(drawing.title);
  const editTitleInputRef = useRef<HTMLInputElement>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // States for the share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [usersForSharing, setUsersForSharing] = useState<IUser[]>([]);
  const [sharedWithUsers, setSharedWithUsers] = useState<IUser[]>([]);
  const [shareSearchTerm, setShareSearchTerm] = useState('');
  const [selectedUserIdToShare, setSelectedUserIdToShare] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isUnsharing, setIsUnsharing] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'manage'>('share');

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingTitle(drawing.title);
    setRenameError(null);
  }, [drawing.title]);

  useEffect(() => {
    if (isEditing && editTitleInputRef.current) {
      editTitleInputRef.current.focus();
      editTitleInputRef.current.select();
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && editTitleInputRef.current && !editTitleInputRef.current.contains(event.target as Node)) {
        handleCancelEdit();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, handleCancelEdit]);

  const lastUpdatedText = i18nCardIsLoading
    ? "Last updated:"
    : t('drawingCard.lastUpdatedPrefix') || "Last updated:";

  const editTitleAriaLabel = i18nCardIsLoading
    ? "Edit title"
    : t('drawingCard.editTitleAria') || "Edit title";

  const deleteButtonAriaLabel = i18nCardIsLoading
    ? "Delete drawing"
    : t('drawingCard.deleteAria') || "Delete drawing";
  
  const shareButtonAriaLabel = i18nCardIsLoading
    ? "Share drawing"
    : t('drawingCard.shareAria') || "Share drawing";

  const handleStartEdit = () => {
    setEditingTitle(drawing.title);
    setIsEditing(true);
    setRenameError(null);
  };

  const handleConfirmEdit = async () => {
    if (!editingTitle.trim()) {
      setRenameError(t('drawingCard.errors.titleRequired') || "Title is required.");
      return;
    }
    if (editingTitle.trim() === drawing.title) {
      setIsEditing(false);
      setRenameError(null);
      return;
    }
    try {
      setRenameError(null);
      const response = await apiUpdateDrawing(drawing._id, { title: editingTitle.trim() });
      if (response.data) {
        onDrawingRenamed(response.data);
        setIsEditing(false);
      } else {
        setRenameError(response.error || t('drawingCard.errors.renameFailed') || "Failed to rename drawing.");
      }
    } catch (err) {
      setRenameError(t('drawingCard.errors.renameFailed') || "Failed to rename drawing.");
      console.error("Rename error:", err);
    }
  };

  const handleEditTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleConfirmEdit();
    }
    if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleOpenDeleteModal = () => {
    setShowDeleteModal(true);
    setDeleteError(null);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteError(null);
      const response = await apiDeleteDrawing(drawing._id);
      if (response.data) {
        onDrawingDeleted(drawing._id);
        setShowDeleteModal(false);
      } else {
        setDeleteError(response.error || t('drawingCard.errors.deleteFailed') || "Failed to delete drawing.");
      }
    } catch (err) {
      setDeleteError(t('drawingCard.errors.deleteFailed') || "Failed to delete drawing.");
      console.error("Delete error:", err);
    }
  };

  // Functions for the share modal
  const handleOpenShareModal = async () => {
    setShowShareModal(true);
    setShareError(null);
    setSelectedUserIdToShare(null);
    setShareSearchTerm('');
    setActiveTab('share');
    setIsLoadingUsers(true);
    
    try {
      const response = await apiGetUsers();
      if (response.data) {
        // Get all users
        const allUsers = response.data;
        
        // Filter users that already have access
        const sharedWithUserIds = drawing.shared_with || [];
        const usersWithAccess = allUsers.filter(user => 
          sharedWithUserIds.includes(user._id as string)
        );
        
        // Filter users that don't have access yet (excluding the owner)
        const usersWithoutAccess = allUsers.filter(user => 
          user._id !== drawing.owner_id && 
          !sharedWithUserIds.includes(user._id as string)
        );
        
        setSharedWithUsers(usersWithAccess);
        setUsersForSharing(usersWithoutAccess);
      } else {
        setShareError(response.error || t('drawingCard.errors.loadUsersFailed') || "Failed to load users.");
      }
    } catch (err) {
      setShareError(t('drawingCard.errors.loadUsersFailed') || "Failed to load users.");
      console.error("Load users error:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setSelectedUserIdToShare(null);
    setShareSearchTerm('');
    setShareError(null);
  };

  const handleConfirmShare = async () => {
    if (!selectedUserIdToShare) {
      setShareError(t('drawingCard.errors.userNotSelected') || "Please select a user to share with.");
      return;
    }
    setIsSharing(true);
    setShareError(null);
    
    try {
      const response = await apiShareDrawing(drawing._id, selectedUserIdToShare);
      if (response.data) {
        // Find the user that was shared with
        const sharedUser = usersForSharing.find(user => user._id === selectedUserIdToShare);
        if (sharedUser) {
          // Add to shared users list
          setSharedWithUsers(prev => [...prev, sharedUser]);
          // Remove from available users list
          setUsersForSharing(prev => prev.filter(user => user._id !== selectedUserIdToShare));
        }
        
        if (onDrawingShared) {
          onDrawingShared(response.data);
        }
        setSelectedUserIdToShare(null);
      } else {
        setShareError(response.error || t('drawingCard.errors.shareFailed') || "Failed to share drawing.");
      }
    } catch (err) {
      setShareError(t('drawingCard.errors.shareFailed') || "Failed to share drawing.");
      console.error("Share error:", err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshareDrawing = async (userId: string) => {
    setIsUnsharing(true);
    setShareError(null);
    
    try {
      const response = await apiUnshareDrawing(drawing._id, userId);
      if (response.data) {
        // Find the user that was unshared
        const unsharedUser = sharedWithUsers.find(user => user._id === userId);
        if (unsharedUser) {
          // Remove from shared users list
          setSharedWithUsers(prev => prev.filter(user => user._id !== userId));
          // Add to available users list
          setUsersForSharing(prev => [...prev, unsharedUser]);
        }
        
        if (onDrawingShared) {
          onDrawingShared(response.data);
        }
      } else {
        setShareError(response.error || t('drawingCard.errors.unshareFailed') || "Failed to unshare drawing.");
      }
    } catch (err) {
      setShareError(t('drawingCard.errors.unshareFailed') || "Failed to unshare drawing.");
      console.error("Unshare error:", err);
    } finally {
      setIsUnsharing(false);
    }
  };

  const filteredUsersForSharing = usersForSharing.filter((user) =>
    user.username.toLowerCase().includes(shareSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(shareSearchTerm.toLowerCase())
  );

  const filteredSharedWithUsers = sharedWithUsers.filter((user) =>
    user.username.toLowerCase().includes(shareSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(shareSearchTerm.toLowerCase())
  );

  const modalTitle = i18nCardIsLoading
    ? "Confirm Deletion"
    : t('drawingCard.confirmDelete.title') || "Confirm Deletion";
  
  let modalMessage = `Are you sure you want to delete "${drawing.title}"? This action cannot be undone.`;
  if (!i18nCardIsLoading) {
    const messageTemplate = t('drawingCard.confirmDelete.message');
    if (messageTemplate) {
      modalMessage = messageTemplate.replace('{{title}}', drawing.title);
    } else {
        modalMessage = `Are you sure you want to delete "${drawing.title}"? This action cannot be undone.`;
    }
  }

  const modalConfirmButtonText = i18nCardIsLoading
    ? "Delete"
    : t('drawingCard.confirmDelete.confirmButton') || "Delete";

  const modalCancelButtonText = i18nCardIsLoading
    ? "Cancel"
    : t('drawingCard.confirmDelete.cancelButton') || "Cancel";

  // Texts for the share modal
  const shareModalTitle = i18nCardIsLoading
    ? "Share Drawing"
    : t('drawingCard.shareModal.title') || "Share Drawing";
  const shareModalSearchPlaceholder = i18nCardIsLoading
    ? "Search user by name or email"
    : t('drawingCard.shareModal.searchPlaceholder') || "Search user by name or email";
  const shareModalConfirmButtonText = i18nCardIsLoading
    ? "Share"
    : t('drawingCard.shareModal.confirmButton') || "Share";
  const shareModalCancelButtonText = i18nCardIsLoading
    ? "Cancel"
    : t('drawingCard.shareModal.cancelButton') || "Cancel";
  const shareModalNoUsersFoundText = i18nCardIsLoading
    ? "No users available to share with or match your search."
    : t('drawingCard.shareModal.noUsersFound') || "No users available to share with or match your search.";
  const manageSharesTabText = i18nCardIsLoading
    ? "Manage Shares"
    : t('drawingCard.shareModal.manageSharesTab') || "Manage Access";
  const shareTabText = i18nCardIsLoading
    ? "Share"
    : t('drawingCard.shareModal.shareTab') || "Share";
  const noSharedUsersText = i18nCardIsLoading
    ? "This drawing is not shared with anyone yet."
    : t('drawingCard.shareModal.noSharedUsers') || "This drawing is not shared with anyone yet.";
  const unsharingButtonText = i18nCardIsLoading
    ? "Removing access..."
    : t('drawingCard.shareModal.unsharingButton') || "Removing access...";

  return (
    <>
      <div className={styles.cardContainer}>
        {renameError && <p className={styles.renameErrorText}>{renameError}</p>}
        {!isEditing ? (
          <div className={styles.titleContainer}>
            <Link href={`/editor/${drawing._id}`} className={styles.titleLink}>
              <h3 className={styles.cardTitle}>{drawing.title}</h3>
            </Link>
            <div className={styles.actionButtonsContainer}>
              <button onClick={handleStartEdit} className={styles.iconButton} aria-label={editTitleAriaLabel}>
                <Icon name="edit-2" size={18} />
              </button>
              {owned && (
                <>
                  <button onClick={handleOpenShareModal} className={styles.iconButton} aria-label={shareButtonAriaLabel}>
                    <Icon name="share-2" size={18} />
                  </button>
                  <button onClick={handleOpenDeleteModal} className={`${styles.iconButton} ${styles.deleteButton}`} aria-label={deleteButtonAriaLabel}>
                    <Icon name="trash-2" size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.inlineEditForm}>
            <input
              ref={editTitleInputRef}
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={handleEditTitleKeyDown}
              className={styles.inlineInput}
            />
          </div>
        )}
        <Link href={`/editor/${drawing._id}`} className={styles.cardLinkUnderTitle}>
          <div className={styles.cardContent}>
            <p className={styles.cardDate}>
              {`${lastUpdatedText} ${new Date(drawing.updatedAt).toLocaleDateString()}`}
            </p>
          </div>
        </Link>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        title={modalTitle}
      >
        <p>{modalMessage}</p>
        {deleteError && <p className={styles.modalErrorText}>{deleteError}</p>}
        <div className={styles.modalFooter}>
            <button onClick={handleCloseDeleteModal} className={styles.modalButtonCancel}>
                {modalCancelButtonText}
            </button>
            <button onClick={handleConfirmDelete} className={styles.modalButtonConfirm}>
                {modalConfirmButtonText}
            </button>
        </div>
      </Modal>

      {/* Share modal */}
      <Modal
        isOpen={showShareModal}
        onClose={handleCloseShareModal}
        title={shareModalTitle}
      >
        <div className={styles.shareModalContent}>
          <div className={styles.tabsContainer}>
            <button 
              className={`${styles.tabButton} ${activeTab === 'share' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('share')}
            >
              {shareTabText}
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'manage' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              {manageSharesTabText}
            </button>
          </div>
          
          <input
            type="text"
            placeholder={shareModalSearchPlaceholder}
            value={shareSearchTerm}
            onChange={(e) => setShareSearchTerm(e.target.value)}
            className={styles.shareSearchInput}
            disabled={isLoadingUsers || isSharing || isUnsharing}
          />
          
          {isLoadingUsers && <p>{t('drawingCard.shareModal.loadingUsers') || 'Loading users...'}</p>}
          {shareError && <p className={styles.modalErrorText}>{shareError}</p>}
          
          {activeTab === 'share' && !isLoadingUsers && (
            <>
              {filteredUsersForSharing.length === 0 && (
                <p>{shareModalNoUsersFoundText}</p>
              )}

              {filteredUsersForSharing.length > 0 && (
                <ul className={styles.userListShare}>
                  {filteredUsersForSharing.map((user) => (
                    <li
                      key={user._id as string}
                      onClick={() => !isSharing && setSelectedUserIdToShare(user._id as string)}
                      className={`${styles.userListItemShare} ${selectedUserIdToShare === user._id ? styles.selectedUser : ''} ${isSharing ? styles.disabledItem : ''}`}
                    >
                      {user.username} ({user.email})
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          
          {activeTab === 'manage' && !isLoadingUsers && (
            <>
              {filteredSharedWithUsers.length === 0 && (
                <p>{noSharedUsersText}</p>
              )}

              {filteredSharedWithUsers.length > 0 && (
                <ul className={styles.userListManage}>
                  {filteredSharedWithUsers.map((user) => (
                    <li key={user._id as string} className={styles.userListItemManage}>
                      <span className={styles.userInfo}>
                        {user.username} ({user.email})
                      </span>
                      <button 
                        onClick={() => !isUnsharing && handleUnshareDrawing(user._id as string)}
                        className={`${styles.unshareButton} ${isUnsharing ? styles.disabledButton : ''}`}
                        disabled={isUnsharing}
                        title={isUnsharing ? unsharingButtonText : t('drawingCard.shareModal.unsharingButton') || "Unshare"}
                      >
                        <Icon name="user-x" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            onClick={handleCloseShareModal} 
            className={styles.modalButtonCancel}
            disabled={isSharing || isUnsharing}
          >
            {shareModalCancelButtonText}
          </button>
          
          {activeTab === 'share' && (
            <button 
              onClick={handleConfirmShare} 
              className={styles.modalButtonConfirm} 
              disabled={!selectedUserIdToShare || isLoadingUsers || isSharing}
            >
              {isSharing ? (t('drawingCard.shareModal.sharingButton') || 'Sharing...') : shareModalConfirmButtonText}
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}