export default function ProfilePage() {
  return (
    <div className="w-full max-w-xl flex flex-col gap-6">
      <div className="bg-gray-900 rounded-md p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-white text-xl font-semibold">
          ?
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-white font-semibold text-base">—</span>
          <span className="text-gray-400 text-sm">—</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-md p-6 flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Roles
        </h2>
        <div className="flex gap-2">
          <span className="text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded-full">
            guest
          </span>
        </div>
      </div>
    </div>
  );
}
