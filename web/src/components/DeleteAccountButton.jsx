import { useState } from 'react';
import { deleteAccount } from '../libs/requests';

/**
 * Delete Account Button Component
 * Reusable component for account deletion with confirmation modal
 *
 * @param {Function} onDeleteSuccess - Callback executed after successful deletion
 * @param {string} className - Optional CSS classes for the button
 */
export default function DeleteAccountButton({ onDeleteSuccess, className = '' }) {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const openModal = () => {
    setShowModal(true);
    setPassword('');
    setError('');
  };

  const closeModal = () => {
    if (isDeleting) return; // Prevent closing during deletion
    setShowModal(false);
    setPassword('');
    setError('');
  };

  const handleDelete = async () => {
    // Validation
    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      await deleteAccount({ password });
      // Success - reset state before calling parent callback
      setIsDeleting(false);
      setShowModal(false);
      setPassword('');
      // Success - call parent callback
      if (onDeleteSuccess) {
        await onDeleteSuccess();
      }
    } catch (err) {
      // Handle error
      const errorMessage = err.response?.data?.message || 'فشل حذف الحساب. تحقق من كلمة المرور.';
      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isDeleting) {
      handleDelete();
    }
  };

  return (
    <>
      {/* Delete Button */}
      <button
        type="button"
        onClick={openModal}
        className={`bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 ${className}`}
        aria-label="Delete Account"
      >
        حذف الحساب
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-[#222C32] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <h2 className="text-xl font-bold text-white mb-4">تأكيد حذف الحساب</h2>

            {/* Warning Message */}
            <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4 mb-4">
              <p className="text-gray-300 leading-relaxed">
                هذا الإجراء <span className="text-red-500 font-bold">لا يمكن التراجع عنه</span>.
              </p>
              <p className="text-gray-300 mt-2">سيتم حذف حسابك وجميع رسائلك بشكل دائم.</p>
            </div>

            {/* Password Input */}
            <div className="mb-4">
              <label htmlFor="delete-password" className="block text-gray-300 mb-2 font-medium">
                أدخل كلمة المرور للتأكيد:
              </label>
              <input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2 bg-[#131B20] text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                placeholder="كلمة المرور"
                disabled={isDeleting}
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-sm mt-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-row-reverse">
              <button
                onClick={closeModal}
                disabled={isDeleting}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    جارٍ الحذف...
                  </>
                ) : (
                  'حذف الحساب نهائياً'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
