import React, { useState, useEffect } from 'react';
import { X, UserPlus, Phone, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

export default function EmergencyContacts({ onClose }) {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New Contact Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Contacts from MongoDB
  const fetchContacts = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/contacts');
      setContacts(response.data || []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
      setError('Failed to load your emergency contacts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [currentUser]);

  // Add Contact to MongoDB
  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !currentUser) return;

    // Basic format validation for Twilio (starts with +)
    if (!phone.startsWith('+')) {
      setError("Phone number must include country code (e.g. +91XXXXXXXXXX)");
      return;
    }

    try {
      setIsAdding(true);
      setError(null);
      await axios.post('/api/contacts', {
        name: name.trim(),
        phone: phone.trim()
      });
      
      setSuccessMsg('Contact added successfully!');
      setName('');
      setPhone('');
      fetchContacts();

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to add contact:', err);
      setError('Failed to add contact.');
    } finally {
      setIsAdding(false);
    }
  };

  // Remove Contact from MongoDB
  const handleRemoveContact = async (id) => {
    try {
      await axios.delete(`/api/contacts/${id}`);
      setContacts(contacts.filter(c => c.id !== id));
      setSuccessMsg('Contact removed.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to remove contact:', err);
      setError('Failed to remove contact.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-googleBlue/10 flex items-center justify-center">
              <Phone className="text-googleBlue" size={16} />
            </div>
            <div>
              <h2 className="text-gray-900 font-bold text-sm">Emergency Contacts</h2>
              <p className="text-gray-500 text-xs">Manage who receives your SOS alerts</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto">
          
          {/* Notifications */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-red-600 text-xs">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-start gap-2 text-green-600 text-xs animate-fade-in">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add New Contact Form */}
          <form onSubmit={handleAddContact} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <UserPlus size={14} className="text-googleBlue" />
              Add New Contact
            </h3>
            <div className="space-y-3">
              <div>
                <input 
                  type="text" 
                  placeholder="Contact Name (e.g. Mom)" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-googleBlue"
                  required
                />
              </div>
              <div>
                <input 
                  type="tel" 
                  placeholder="WhatsApp Number (e.g. +1415...)" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-googleBlue"
                  required
                />
                <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Must include country code (e.g., +91). Must be registered in Twilio Sandbox.</p>
              </div>
              <button 
                type="submit"
                disabled={isAdding}
                className="w-full py-2 bg-googleBlue hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : 'Save Contact'}
              </button>
            </div>
          </form>

          {/* Saved Contacts List */}
          <div>
            <h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Saved Contacts</h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-6">
                <div className="w-5 h-5 border-2 border-googleBlue border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-6 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 text-sm">No emergency contacts saved yet.</p>
                <p className="text-gray-600 text-xs mt-1">Add a trusted friend or family member above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                    <div>
                      <h4 className="text-gray-900 text-sm font-medium">{contact.name}</h4>
                      <p className="text-gray-500 text-xs font-mono mt-0.5">{contact.phone}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveContact(contact.id)}
                      className="p-1.5 text-gray-500 hover:text-dangerRed hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove Contact"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
