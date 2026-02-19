import { useEffect, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchClientQuotations,
  requestQuotationAction,
  confirmQuotationAction,
  resetOTPState
} from '@/store/slices/clientQuotationsSlice';
import { Pagination } from '@/components/pagination/Pagination';

// OTP Dialog Component
function OTPDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  quotationTitle, 
  action, 
  loading, 
  error 
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (otp: string) => void;
  quotationTitle: string;
  action: 'ACCEPT' | 'REJECT';
  loading: boolean;
  error?: string | null;
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleConfirm = () => {
    const otpValue = otp.join('');
    if (otpValue.length === 6) {
      onConfirm(otpValue);
    }
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">
              {action === 'ACCEPT' ? '✅' : '❌'}
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {action === 'ACCEPT' ? 'Accept' : 'Reject'} Quotation
            </h3>
            <p className="text-sm text-slate-600 mt-1 mb-6">
              {quotationTitle}
            </p>
            <p className="text-sm text-slate-700 mb-6">
              Please enter the 6-digit verification code sent to your email
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* OTP Input */}
          <div className="flex justify-center space-x-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-lg font-semibold border-2 border-slate-300 rounded-lg focus:border-primary-500 focus:outline-none"
                disabled={loading}
              />
            ))}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !isOtpComplete}
              className="flex-1 px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Action Confirmation Dialog
function ActionConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  quotation,
  action,
  loading
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  quotation: any;
  action: 'ACCEPT' | 'REJECT';
  loading: boolean;
}) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">
              {action === 'ACCEPT' ? '✅' : '❌'}
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {action === 'ACCEPT' ? 'Accept' : 'Reject'} Quotation
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {quotation?.title}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Amount: ₹{quotation?.amount?.toLocaleString()}
            </p>
          </div>

          {action === 'REJECT' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for rejection (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-primary-500 focus:outline-none resize-none"
                placeholder="Please provide a reason for rejection..."
              />
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-yellow-600 mr-3">⚠️</div>
              <div>
                <p className="text-sm font-medium text-yellow-800">Double Confirmation Required</p>
                <p className="text-sm text-yellow-700 mt-1">
                  After clicking confirm, you'll receive an email with a verification code to complete this action.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(reason)}
              disabled={loading}
              className={`flex-1 px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center ${
                action === 'ACCEPT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {loading ? 'Sending...' : `${action === 'ACCEPT' ? 'Accept' : 'Reject'} Quotation`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientQuotations() {
  const dispatch = useAppDispatch();
  const { 
    quotations, 
    loading, 
    error, 
    otpState, 
    actionLoading, 
    pendingAction 
  } = useAppSelector(state => state.clientQuotations);

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [actionType, setActionType] = useState<'ACCEPT' | 'REJECT' | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);

  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize;
    return quotations.slice(start, start + currentPageSize);
  }, [quotations, currentPage, currentPageSize]);

  useEffect(() => {
    dispatch(fetchClientQuotations());
  }, [dispatch]);

  useEffect(() => {
    // Show OTP dialog when OTP is sent
    if (otpState.sent && pendingAction) {
      setShowOtpDialog(true);
      setShowConfirmDialog(false);
    }
  }, [otpState.sent, pendingAction]);

  const handleAction = (quotation: any, action: 'ACCEPT' | 'REJECT') => {
    setSelectedQuotation(quotation);
    setActionType(action);
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async (reason?: string) => {
    if (!selectedQuotation || !actionType) return;

    const result = await dispatch(requestQuotationAction({
      quotationId: selectedQuotation.id,
      action: actionType,
      reason: reason || undefined,
    }));

    if (requestQuotationAction.fulfilled.match(result)) {
      // OTP dialog will be shown automatically via useEffect
    } else {
      // Error will be shown in UI
    }
  };

  const handleOtpConfirm = async (otp: string) => {
    if (!pendingAction) return;

    const result = await dispatch(confirmQuotationAction({
      quotationId: pendingAction.quotationId,
      otp: otp,
      action: pendingAction.action,
      reason: pendingAction.reason,
    }));

    if (confirmQuotationAction.fulfilled.match(result)) {
      setShowOtpDialog(false);
      setSelectedQuotation(null);
      setActionType(null);
      // Refresh quotations list
      dispatch(fetchClientQuotations());
    }
  };

  const closeDialogs = () => {
    setShowConfirmDialog(false);
    setShowOtpDialog(false);
    setSelectedQuotation(null);
    setActionType(null);
    dispatch(resetOTPState());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600">Loading quotations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
        <p className="text-slate-600">Review and respond to quotations sent by Greenex team</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-600 mr-3">❌</div>
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quotations Grid */}
      {quotations.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-slate-900">No quotations yet</h3>
          <p className="text-slate-600 mt-2">
            Quotations sent by the Greenex team will appear here
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {paginatedQuotations.map((quotation) => (
            <div key={quotation.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{quotation.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {quotation.lead?.title} • {quotation.lead?.organization?.name}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(quotation.status)}`}>
                    {quotation?.status?.charAt(0).toUpperCase() + quotation?.status?.slice(1)}
                  </span>
                </div>

                {quotation.amount && (
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-primary-600">
                      ₹{quotation.amount.toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-slate-500">Sent Date</p>
                    <p className="text-sm font-medium text-slate-900">
                      {quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString() : 'Not sent yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Valid Until</p>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date().toLocaleDateString()} {/* This should come from backend */}
                    </p>
                  </div>
                </div>

                {quotation.documentPath && (
                  <div className="mb-6">
                    <a
                      href="#"
                      className="inline-flex items-center px-3 py-2 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Quotation PDF
                    </a>
                  </div>
                )}

                {quotation.status === 'SENT' && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleAction(quotation, 'ACCEPT')}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      ✅ Accept Quotation
                    </button>
                    <button
                      onClick={() => handleAction(quotation, 'REJECT')}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      ❌ Reject Quotation
                    </button>
                  </div>
                )}

                {quotation.statusChangedAt && quotation.status !== 'SENT' && (
                  <div className="text-sm text-slate-500 mt-4">
                    {quotation.status === 'ACCEPTED' ? 'Accepted' : 'Rejected'} on{' '}
                    {new Date(quotation.statusChangedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(quotations.length / currentPageSize)}
        totalItems={quotations.length}
        pageSize={currentPageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setCurrentPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Dialogs */}
      <ActionConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={closeDialogs}
        onConfirm={handleConfirmAction}
        quotation={selectedQuotation}
        action={actionType!}
        loading={otpState.pending}
      />

      <OTPDialog
        isOpen={showOtpDialog}
        onClose={closeDialogs}
        onConfirm={handleOtpConfirm}
        quotationTitle={selectedQuotation?.title || ''}
        action={actionType!}
        loading={actionLoading}
        error={otpState.error}
      />
    </div>
  );
}