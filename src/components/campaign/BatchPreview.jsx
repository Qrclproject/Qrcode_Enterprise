export default function BatchPreview({ batchSize, total }) {
  const batches = Math.ceil(total / batchSize);
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-2.5 shadow-sm">
      <h4 className="text-[10px] font-semibold text-amber-700 mb-1 flex justify-between">
        📦 Batch Preview <span className="font-normal text-amber-500">{batches} batch(es)</span>
      </h4>
      <div className="max-h-32 overflow-y-auto text-[9px] space-y-0.5">
        {Array.from({ length: Math.min(batches, 10) }, (_, i) => {
          const start = i * batchSize + 1;
          const end = Math.min((i + 1) * batchSize, total);
          return (
            <div key={i} className="flex justify-between py-0.5 border-b border-amber-100 hover:bg-amber-50/50 rounded transition-colors">
              <span className="font-medium">Batch {i + 1}</span>
              <span>{start}–{end}</span>
              <span className="text-amber-600">{i === 0 ? 'Starts immediately' : `After ${i}s`}</span>
            </div>
          );
        })}
        {batches > 10 && (
          <div className="text-center text-amber-400 py-1">... {batches - 10} more batches ...</div>
        )}
      </div>
    </div>
  );
}