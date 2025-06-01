import React, { useState } from 'react';

const MembershipDetails = () => {
  // Sample membership data
  const [memberships] = useState([
    { id: 1, name: 'John Doe', membershipType: 'Premium', expiryDate: '2025-05-30' },
    { id: 2, name: 'Jane Smith', membershipType: 'Standard', expiryDate: '2024-12-15' },
    { id: 3, name: 'Michael Johnson', membershipType: 'Premium', expiryDate: '2025-03-10' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  // Filter memberships based on search term
  const filteredMemberships = memberships.filter((membership) =>
    membership.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full h-full p-6 bg-black overflow-y-auto">
      {/* Header */}
      <h1 className="text-4xl font-bold text-orange-500 mb-4">Membership Details</h1>
      <p className="text-lg text-white mb-6">
        Manage and view detailed information about your members, including their membership type and expiry date.
      </p>

      {/* Search Input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by member name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-3 w-full border-2 border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Membership List */}
      <div className="space-y-6">
        {filteredMemberships.length === 0 ? (
          <p className="text-white text-center">No members found.</p>
        ) : (
          filteredMemberships.map((membership) => (
            <div
              key={membership.id}
              className="p-6 border-2 border-gray-700 rounded-2xl bg-gray-800 shadow-lg hover:bg-gray-700 transition duration-300"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-white text-xl font-semibold">{membership.name}</h2>
                <span className="text-sm text-gray-400">{membership.membershipType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white">Expiry Date:</span>
                <span className="text-orange-500">{membership.expiryDate}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MembershipDetails;
