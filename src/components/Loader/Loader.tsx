'use client';

import React from 'react';
import styles from './Loader.module.css';

interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  text?: string;
}

export default function Loader({ size = 'medium', fullScreen = false, text }: LoaderProps) {
  return (
    <div className={`${styles.loaderContainer} ${fullScreen ? styles.fullScreen : ''}`}>
      <div className={`${styles.loader} ${styles[size]}`}>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
      </div>
      {text && <p className={styles.loaderText}>{text}</p>}
    </div>
  );
} 