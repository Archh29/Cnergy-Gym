import React from 'react';

const Membership = () => {
  return (
    <div className="flex flex-col w-full h-full p-6 bg-gray-100 overflow-y-auto">
      {/* Header */}
    

      {/* Information Section */}
      <div className="mt-8 p-6 border-2 border-gray-300 rounded-2xl bg-gray-900 shadow-xl hover:shadow-2xl transition duration-300">
        <p className="text-white">
          In this section, you can manage active memberships, track renewals, and view membership-related statistics. Quickly access renewal requests, new memberships, and user details.
        </p>
      </div>

      {/* Action Section */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <button className="w-full p-4 text-white bg-gray-900 hover:bg-orange-500 rounded-2xl shadow-lg hover:shadow-xl transition duration-300">
          View Active Members
        </button>
        <button className="w-full p-4 text-white bg-gray-900 hover:bg-orange-500 rounded-2xl shadow-lg hover:shadow-xl transition duration-300">
          Manage Renewals
        </button>
        <button className="w-full p-4 text-white bg-gray-900 hover:bg-orange-500 rounded-2xl shadow-lg hover:shadow-xl transition duration-300">
          Membership Stats
        </button>
        <button className="w-full p-4 text-white bg-gray-900 hover:bg-orange-500 rounded-2xl shadow-lg hover:shadow-xl transition duration-300">
          Process New Memberships
        </button>
        <button className="w-full p-4 text-white bg-gray-900 hover:bg-orange-500 rounded-2xl shadow-lg hover:shadow-xl transition duration-300">
          Generate Reports
        </button>
      </div>

      {/* Memberships Overview Section */}
      <div className="mt-8 p-6 border-2 border-gray-300 rounded-2xl bg-gray-900 shadow-xl hover:shadow-2xl transition duration-300">
        <h2 className="text-xl font-semibold text-white mb-4">Overview of Memberships</h2>
        <div className="space-y-4">
          <div className="flex justify-between text-white">
            <p>Total Active Members:</p>
            <span>120</span>
          </div>
          <div className="flex justify-between text-white">
            <p>Pending Renewals:</p>
            <span>15</span>
          </div>
          <div className="flex justify-between text-white">
            <p>Memberships Expiring Soon:</p>
            <span>30</span>
          </div>
        </div>
      </div>

      {/* Membership Renewal Requests */}
      <div className="mt-8 p-6 border-2 border-gray-300 rounded-2xl bg-gray-900 shadow-xl hover:shadow-2xl transition duration-300">
        <h2 className="text-xl font-semibold text-white mb-4">Membership Renewal Requests</h2>
        <div className="space-y-4">
          <button className="w-full p-3 bg-gray-800 hover:bg-orange-500 rounded-md text-left text-white">
            John Doe - Expiring on 02/20/2025
          </button>
          <button className="w-full p-3 bg-gray-800 hover:bg-orange-500 rounded-md text-left text-white">
            Jane Smith - Expiring on 02/25/2025
          </button>
          <button className="w-full p-3 bg-gray-800 hover:bg-orange-500 rounded-md text-left text-white">
            Mark Johnson - Expiring on 03/01/2025
          </button>
        </div>
      </div>

    </div>
  );
};

export default Membership;
