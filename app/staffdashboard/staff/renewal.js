import React, { useState } from 'react';

const Renewal = () => {
  // Sample data for membership renewals
  const [memberships, setMemberships] = useState([
    { id: 1, user: 'John Doe', membershipType: 'Gold', expirationDate: '2025-03-01', status: 'Active' },
    { id: 2, user: 'Jane Smith', membershipType: 'Silver', expirationDate: '2025-02-20', status: 'Expired' },
    { id: 3, user: 'Michael Lee', membershipType: 'Bronze', expirationDate: '2025-04-15', status: 'Active' },
  ]);

  // Function to renew a membership
  const renewMembership = (id) => {
    setMemberships(
      memberships.map((membership) =>
        membership.id === id
          ? { ...membership, expirationDate: '2025-12-31', status: 'Active' }
          : membership
      )
    );
  };

  // Function to change the membership status (e.g., expired)
  const changeStatus = (id) => {
    setMemberships(
      memberships.map((membership) =>
        membership.id === id ? { ...membership, status: 'Expired' } : membership
      )
    );
  };

  return (
    <div className="flex flex-col w-full h-full p-6 bg-gray-100 overflow-y-auto">
      {/* Header */}
      

      {/* Membership Renewal List */}
      <div className="space-y-6">
        {memberships.map((membership) => (
          <div
            key={membership.id}
            className={`p-6 border-2 rounded-2xl ${
              membership.status === 'Active' ? 'bg-gray-900' : 'bg-gray-800'
            } shadow-lg hover:shadow-xl transition duration-300`}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-white text-xl">{membership.user}</h2>
              <span
                className={`text-sm font-semibold ${
                  membership.status === 'Active' ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {membership.status}
              </span>
            </div>
            <p className="text-white">Membership Type: {membership.membershipType}</p>
            <p className="text-white">Expiration Date: {membership.expirationDate}</p>

            {/* Action Buttons */}
            <div className="mt-4 flex justify-between items-center">
              {membership.status === 'Expired' ? (
                <button
                  onClick={() => renewMembership(membership.id)}
                  className="px-5 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition duration-300"
                >
                  Renew Membership
                </button>
              ) : (
                <button
                  onClick={() => changeStatus(membership.id)}
                  className="px-5 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition duration-300"
                >
                  Mark as Expired
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Renewal;
