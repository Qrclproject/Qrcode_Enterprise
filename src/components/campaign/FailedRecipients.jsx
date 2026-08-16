export default function FailedRecipients({ failedList, onRetryAll, onRetrySingle }) {
  if (!failedList || failedList.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-2.5 shadow-sm">
      <h4 className="text-[10px] font-semibold text-red-600 mb-1 flex justify-between">
        ❌ Failed Recipients <span className="font-normal text-red-400">{failedList.length} remaining</span>
      </h4>
      <div className="max-h-24 overflow-y-auto text-[9px] space-y-0.5">
        {failedList.map((r, idx) => (
          <div key={idx} className="flex justify-between py-0.5 border-b border-red-100 hover:bg-red-50/50 rounded transition-colors">
            <span>{r.phone}</span>
            <span className="text-red-500">{r.reason}</span>
            <button onClick={() => onRetrySingle(idx)} className="text-red-600 hover:text-red-800 hover:underline text-xs ml-2">
              Retry
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onRetryAll}
        className="mt-2 w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1.5 rounded-lg text-[10px] font-medium hover:from-red-600 hover:to-red-700 shadow-sm transition-all"
      >
        Retry All Failed
      </button>
    </div>
  );
}