import React, { useState } from 'react';
import { Card, Divider } from '../components/UI.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function AboutMeScreen({ user, onBack, updatePersonalInfo, updateProfile }) {
  const { verifyPassword } = useAuth();
  const [view, setView] = useState('display'); // 'display' | 'auth' | 'edit'
  const info = (user?.personalInfo && Object.keys(user.personalInfo).length > 0) ? user.personalInfo : null;

  // Auth State
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleStartEdit = () => {
    setView('auth');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsVerifying(true);
    
    const isValid = await verifyPassword(password);
    if (isValid) {
      setView('edit');
    } else {
      setAuthError('Incorrect account password. Please try again.');
    }
    setIsVerifying(false);
    setPassword('');
  };

  // --- RESTORED STATE & CONSTANTS ---
  const initialFormData = {
    fullName: info?.fullName || user?.name || '',
    maritalStatus: info?.maritalStatus || '',
    partnerName: info?.partnerName || '',
    partnerPhone: info?.partnerPhone || '',
    momName: info?.momName || '',
    momPhone: info?.momPhone || '',
    dadName: info?.dadName || '',
    dadPhone: info?.dadPhone || '',
    occupationType: info?.schoolOffice ? info.schoolOffice.split(' - ')[0] : '',
    schoolOffice: (info?.schoolOffice && info.schoolOffice.includes(' - ')) ? info.schoolOffice.split(' - ')[1] : '',
    emergencyContactName: info?.emergencyContactName || user?.emergencyContacts?.[0]?.name || '',
    emergencyContactPhone: info?.emergencyContactPhone || user?.emergencyContacts?.[0]?.phone || '',
    age: info?.age || '',
    bloodGroup: info?.bloodGroup || '',
    mobileNumber: info?.mobileNumber || user?.phone || '',
    homeAddress: info?.homeAddress || '',
    medicalInfo: info?.medicalInfo || ''
  };

  if (info?.schoolOffice === 'None') {
    initialFormData.occupationType = 'None';
    initialFormData.schoolOffice = '';
  }

  const [formData, setFormData] = useState(initialFormData);
  const [editError, setEditError] = useState('');

  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const OCCUPATION_TYPES = ['School', 'College', 'Office', 'None'];
  const MARITAL_STATUSES = ['Married', 'Unmarried'];

  const handleSave = (e) => {
    e.preventDefault();
    setEditError('');

    const { fullName, maritalStatus, occupationType, schoolOffice, emergencyContactName, emergencyContactPhone, age, bloodGroup, homeAddress } = formData;

    if (!fullName.trim()) return setEditError('Full name is required.');
    if (!formData.momName.trim() || !formData.momPhone.trim()) return setEditError('Mother details are required.');
    if (!formData.dadName.trim() || !formData.dadPhone.trim()) return setEditError('Father details are required.');

    if (!maritalStatus) return setEditError('Marital status is required.');
    if (maritalStatus === 'Married') {
      if (!formData.partnerName.trim() || !formData.partnerPhone.trim()) return setEditError('Partner details are required.');
    }

    if (!occupationType) return setEditError('Please select occupation.');
    if (occupationType !== 'None' && !schoolOffice.trim()) return setEditError('Institution name is required.');
    
    if (!emergencyContactName.trim() || !emergencyContactPhone.trim()) return setEditError('Emergency contact is required.');
    if (!age || isNaN(age)) return setEditError('Valid age is required.');
    if (!bloodGroup) return setEditError('Blood group is required.');
    if (!formData.mobileNumber.trim()) return setEditError('Mobile number is required.');
    if (!homeAddress.trim()) return setEditError('Home address is required.');

    const updatedInfo = {
      ...formData,
      fullName: fullName.trim(),
      schoolOffice: occupationType === 'None' ? 'None' : `${occupationType} - ${schoolOffice.trim()}`,
      age: parseInt(age, 10),
      medicalInfo: formData.medicalInfo.trim()
    };

    // Update both top-level profile and nested personal info
    updateProfile({
      fullName: fullName.trim(),
      phone: formData.mobileNumber.trim(),
      personalInfo: updatedInfo
    });
    setView('display');
  };

  const inputBase = "w-full rounded-xl px-4 py-3 font-dm text-sm text-sahas-text bg-sahas-dark border border-sahas-border transition-all outline-none focus:border-sahas-red";

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-sahas-dark flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center animate-scale-in">
          <h2 className="font-syne font-800 text-3xl text-sahas-text mb-2 tracking-tight">Verify Identity</h2>
          <p className="font-dm text-sm text-sahas-soft mb-8 leading-relaxed px-4">
            Enter your password to verify your identity and edit your personal details.
          </p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password"
              placeholder="Enter Account Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputBase}
              autoFocus
            />
            {authError && <p className="text-xs text-sahas-red font-dm animate-shake">{authError}</p>}
            
            <div className="flex gap-3 pt-6">
              <button type="button" onClick={() => setView('display')} className="flex-1 py-4 rounded-2xl border border-sahas-border text-sahas-soft font-dm font-bold text-sm">Cancel</button>
              <button type="submit" disabled={isVerifying} className="flex-[1.5] py-4 rounded-2xl bg-sahas-red text-white font-syne font-bold text-sm active:scale-95 disabled:opacity-50 transition-all">
                {isVerifying ? 'Verifying...' : 'Confirm Identity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'edit') {
    return (
      <div className="min-h-screen bg-sahas-dark flex flex-col p-6 overflow-y-auto">
        <div className="max-w-md mx-auto w-full animate-slide-up">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-syne font-bold text-2xl text-sahas-text">Edit Details</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4 font-dm">
              <div>
                <label className="text-[10px] font-bold text-sahas-soft uppercase tracking-widest block mb-1.5 ml-1">Full Name</label>
                <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className={inputBase} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={formData.momName} onChange={e => setFormData({...formData, momName: e.target.value})} className={inputBase} placeholder="Mother Name" />
                <input type="tel" value={formData.momPhone} onChange={e => setFormData({...formData, momPhone: e.target.value})} className={inputBase} placeholder="Mother Phone" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={formData.dadName} onChange={e => setFormData({...formData, dadName: e.target.value})} className={inputBase} placeholder="Father Name" />
                <input type="tel" value={formData.dadPhone} onChange={e => setFormData({...formData, dadPhone: e.target.value})} className={inputBase} placeholder="Father Phone" />
              </div>
              <div>
                <select value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})} className={inputBase}>
                  <option value="" disabled>Select Marital Status</option>
                  {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {formData.maritalStatus === 'Married' && (
                <div className="grid grid-cols-2 gap-3 animate-slide-up">
                  <input type="text" value={formData.partnerName} onChange={e => setFormData({...formData, partnerName: e.target.value})} className={inputBase} placeholder="Partner Name" />
                  <input type="tel" value={formData.partnerPhone} onChange={e => setFormData({...formData, partnerPhone: e.target.value})} className={inputBase} placeholder="Partner Phone" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <select value={formData.occupationType} onChange={e => setFormData({...formData, occupationType: e.target.value})} className={inputBase}>
                  <option value="" disabled>Occupation</option>
                  {OCCUPATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {formData.occupationType !== 'None' && (
                  <input type="text" value={formData.schoolOffice} onChange={e => setFormData({...formData, schoolOffice: e.target.value})} className={inputBase} placeholder="Institution" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className={inputBase} placeholder="Age" />
                <select value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} className={inputBase}>
                  <option value="" disabled>Blood Group</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-sahas-soft uppercase tracking-widest block mb-1.5 ml-1">Mobile Number</label>
                <input type="tel" value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} className={inputBase} placeholder="Your Mobile Number" />
              </div>
              <textarea value={formData.homeAddress} onChange={e => setFormData({...formData, homeAddress: e.target.value})} className={`${inputBase} h-20`} placeholder="Home Address" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={formData.emergencyContactName} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} className={inputBase} placeholder="Emergency Contact Name" />
                <input type="tel" value={formData.emergencyContactPhone} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} className={inputBase} placeholder="Emergency Contact Phone" />
              </div>
              <textarea value={formData.medicalInfo} onChange={e => setFormData({...formData, medicalInfo: e.target.value})} className={`${inputBase} h-20`} placeholder="Medical Notes (Optional)" />
            </div>

            {editError && <p className="text-xs text-sahas-red font-dm text-center">{editError}</p>}
            <div className="flex gap-4 pt-4 pb-10">
              <button type="button" onClick={() => setView('display')} className="flex-1 py-4 rounded-xl border border-sahas-border text-sahas-soft font-dm font-bold text-sm">Cancel</button>
              <button type="submit" className="flex-2 py-4 rounded-xl bg-sahas-red text-white font-dm font-bold text-sm shadow-xl">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sahas-dark noise flex flex-col pt-6 pb-20">
      <div className="px-5 mb-8 flex items-center justify-between">
        <div>
          <p className="text-sahas-soft text-xs font-dm tracking-widest uppercase mb-1">Personal Details</p>
          <h1 className="font-syne font-800 text-3xl text-sahas-text">About Me <span className="text-sahas-red">.</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleStartEdit} className="px-4 py-2 rounded-xl bg-sahas-card border border-sahas-border text-xs font-dm font-bold text-sahas-soft hover:text-sahas-red transition-all">Edit</button>
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-sahas-card border border-sahas-border flex items-center justify-center text-sahas-soft hover:text-sahas-red transition-colors">✕</button>
        </div>
      </div>

      <div className="px-5 space-y-6 flex-1 overflow-y-auto pb-10">
        {!info ? (
          <div className="text-center py-20 bg-sahas-card rounded-3xl border border-dashed border-sahas-border">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="text-sahas-soft font-dm text-sm">No profile information found.</p>
          </div>
        ) : (
          <>
            <div className="animate-slide-up">
              <p className="text-[10px] font-syne font-bold text-sahas-red uppercase tracking-widest mb-3 ml-1">Identity & Occupation</p>
              <Card className="p-5 space-y-4">
                <div className="flex flex-col"><span className="text-xs font-dm text-sahas-soft uppercase mb-1">Full Name</span><span className="text-base font-dm text-sahas-text font-semibold">{info.fullName}</span></div>
                <Divider />
                <div className="flex flex-col"><span className="text-xs font-dm text-sahas-soft uppercase mb-1">Mobile Number</span><span className="text-base font-dm text-sahas-text font-semibold">{info.mobileNumber || 'Not specified'}</span></div>
                <Divider />
                <div className="flex flex-col"><span className="text-xs font-dm text-sahas-soft uppercase mb-1">Occupation</span><span className="text-base font-dm text-sahas-text font-semibold">{info.schoolOffice}</span></div>
              </Card>
            </div>
            <div className="animate-slide-up">
              <p className="text-[10px] font-syne font-bold text-sahas-red uppercase tracking-widest mb-3 ml-1">Family & Emergency</p>
              <Card className="p-5 space-y-4">
                <div className="flex flex-col"><span className="text-xs font-dm text-sahas-soft uppercase mb-1">Mother</span><span className="text-base font-dm text-sahas-text font-semibold">{info.momName}</span><span className="text-sm font-dm text-sahas-soft">{info.momPhone}</span></div>
                <Divider />
                <div className="flex flex-col"><span className="text-xs font-dm text-sahas-soft uppercase mb-1">Father</span><span className="text-base font-dm text-sahas-text font-semibold">{info.dadName}</span><span className="text-sm font-dm text-sahas-soft">{info.dadPhone}</span></div>
              </Card>
            </div>
            <div className="animate-slide-up">
              <p className="text-[10px] font-syne font-bold text-sahas-red uppercase tracking-widest mb-3 ml-1">Medical</p>
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col"><span className="text-xs font-dm text-sahas-soft uppercase mb-1">Age</span><span className="text-base font-dm text-sahas-text font-semibold">{info.age} Yrs</span></div>
                  <div className="flex flex-col items-end"><span className="text-xs font-dm text-sahas-soft uppercase mb-1">Blood Group</span><span className="text-xl font-syne font-800 text-sahas-red">{info.bloodGroup}</span></div>
                </div>
                <Divider />
                <div className="flex flex-col"><span className="text-xs font-dm text-sahas-soft uppercase mb-1">Emergency Contact</span><span className="text-base font-dm text-sahas-text font-semibold">{info.emergencyContactName}</span><span className="text-sm font-dm text-sahas-soft">{info.emergencyContactPhone}</span></div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
