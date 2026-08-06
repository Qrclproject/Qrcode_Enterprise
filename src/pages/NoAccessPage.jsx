export default function NoAccessPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-5">
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center max-w-md">
        <i className="fas fa-lock text-5xl text-gray-300 mb-4 block"></i>
        <h1 className="text-xl font-bold text-gray-700 mb-2">No Access</h1>
        <p className="text-sm text-gray-500">
          You don't have permission to view this page. Please contact your administrator.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 text-orange-500 hover:underline text-sm"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}