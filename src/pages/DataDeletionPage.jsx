export default function DataDeletionPage() {
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-3xl mx-auto space-y-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Data Deletion Instructions</h1>
        <p className="text-xs text-gray-400">Last updated: July 29, 2026</p>

        <p className="text-sm text-gray-700 leading-relaxed">
          At QRCODE ENTERPRISE, we respect your privacy and your right to control your
          personal data. This page explains how you can request the deletion of your data
          associated with our WhatsApp ticketing and QR‑code delivery platform.
        </p>

        <h2 className="text-lg font-semibold text-gray-800">How to Request Data Deletion</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          You can delete your account and all associated data directly from your dashboard,
          or by contacting our support team.
        </p>

        <h3 className="text-md font-semibold text-gray-700">Option 1: Delete from Dashboard</h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          Log in to your account at{' '}
          <a href="https://qrclfrontendevent.vercel.app" className="text-orange-500 hover:underline">
            qrclfrontendevent.vercel.app
          </a>
          , navigate to <strong>Settings → Danger Zone</strong>, and click
          <strong> “Delete Account”</strong>. This will permanently erase all your personal
          information, campaign data, and uploaded attendee lists from our servers.
        </p>

        <h3 className="text-md font-semibold text-gray-700">Option 2: Email Request</h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          Send an email to{' '}
          <a href="mailto:support@qrcl.ng" className="text-orange-500 hover:underline">
            support@qrcl.ng
          </a>{' '}
          with the subject line “Data Deletion Request”. Please include the email address
          associated with your account. We will process your request within 14 business days
          and confirm once your data has been deleted.
        </p>

        <h3 className="text-md font-semibold text-gray-700">What Data Is Deleted</h3>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Your account profile (name, email, password hash).</li>
          <li>All campaigns you created (recipient lists, message logs).</li>
          <li>All uploaded attendee data (names, phone numbers, QR code URLs).</li>
          <li>All generated QR code images stored on Cloudinary.</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-800">Contact Us</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          If you have any questions about data deletion, please contact:
          <br />
          <strong>Email:</strong> support@qrcl.ng
          <br />
          <strong>Address:</strong> 123 QR Code Street, Lagos, Nigeria.
        </p>
      </div>
    </div>
  );
}