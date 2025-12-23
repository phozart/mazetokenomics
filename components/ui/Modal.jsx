'use client';

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  className,
}) {
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full bg-dark-card border border-dark-border shadow-2xl',
          'animate-in fade-in duration-200',
          'rounded-t-2xl sm:rounded-xl',
          'slide-in-from-bottom-4 sm:zoom-in-95',
          'max-h-[90vh] overflow-y-auto',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-6 py-4 border-b border-dark-border">
            <div className="flex items-start justify-between">
              <div>
                {title && (
                  <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-gray-400">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}

export function ModalFooter({ children, className }) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 pt-4 border-t border-dark-border -mx-6 -mb-6 px-6 py-4 mt-6',
        className
      )}
    >
      {children}
    </div>
  );
}
