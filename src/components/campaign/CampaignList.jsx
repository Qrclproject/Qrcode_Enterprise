const statusColors = {
  completed: 'bg-green-100 text-green-700',
  delivered: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  sending: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-gray-100 text-gray-600',
};

export default function CampaignList({ campaigns, onEdit, onDelete, onView }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 shadow-sm">
        <i className="fas fa-inbox text-4xl mb-2 block"></i>
        No campaigns found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-gradient-to-b from-gray-50 to-gray-100 text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="px-5 py-3">Campaign</th>
              <th className="px-5 py-3">Template</th>
              <th className="px-5 py-3">Variants</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Recipients</th>
              <th className="px-5 py-3">Batch Info</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.map((c) => {
              const recipCount = Array.isArray(c.recipients) ? c.recipients.length : c.recipients;
              const activeVariantCount = c.activeVariants?.length || 1;
              const totalVariants = c.variants?.length || 1;
              const variantDisplay = `${activeVariantCount}/${totalVariants}`;
              const batchInfo = `${c.batchSize || '?'} msgs · ${
                c.waitValue || '?'} ${c.waitUnit || 'min'}`;

              return (
                <tr key={c._id || c.id} className="hover:bg-orange-50/50 transition-colors">
                  <td className="px-5 py-4 font-medium">{c.name}</td>
                  <td className="px-5 py-4 text-gray-600">{c.templateName || c.template || '—'}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-100">
                      {variantDisplay} variants
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">{recipCount}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">{batchInfo}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`status-badge ${statusColors[c.status] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {c.status === 'completed'
                        ? 'Delivered'
                        : c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(c._id || c.id)}
                        className="text-gray-400 hover:text-orange-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                        title="Edit & Resend"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => onDelete(c._id || c.id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                        title="Delete"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                      {onView && (
                        <button
                          onClick={() => onView(c._id || c.id)}
                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                          title="View details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}