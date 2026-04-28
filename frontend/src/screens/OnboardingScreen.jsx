import React, { useState } from 'react';

export default function OnboardingScreen({ user, onComplete }) {
  const [fullName, setFullName] = useState(user?.name || '');
  const [mobileNumber, setMobileNumber] = useState(user?.phone || '');
  
  // Marital & Family State
  const [maritalStatus, setMaritalStatus] = useState(''); // 'Married' | 'Unmarried'
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [momName, setMomName] = useState('');
  const [momPhone, setMomPhone] = useState('');
  const [dadName, setDadName] = useState('');
  const [dadPhone, setDadPhone] = useState('');

  // Occupation State
  const [occupationType, setOccupationType] = useState('');
  const [schoolOffice, setSchoolOffice] = useState('');
  
  const [emergencyContactName, setEmergencyContactName] = useState(user?.emergencyContacts?.[0]?.name || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user?.emergencyContacts?.[0]?.phone || '');
  
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [medicalInfo, setMedicalInfo] = useState('');
  const [error, setError] = useState('');

  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const OCCUPATION_TYPES = ['School', 'College', 'Office', 'None'];
  const MARITAL_STATUSES = ['Married', 'Unmarried'];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) return setError('Please enter your full name.');
    if (!mobileNumber.trim()) return setError('Please enter your mobile number.');
    
    if (!maritalStatus) return setError('Please select your marital status.');
    
    // Parents are always mandatory
    if (!momName.trim() || !momPhone.trim()) return setError('Please provide Mother\'s details.');
    if (!dadName.trim() || !dadPhone.trim()) return setError('Please provide Father\'s details.');

    // Partner is mandatory only if married
    if (maritalStatus === 'Married') {
      if (!partnerName.trim() || !partnerPhone.trim()) return setError('Please provide Partner\'s details.');
    }

    if (!occupationType) return setError('Please select your occupation.');
    if (occupationType !== 'None' && !schoolOffice.trim()) return setError('Please enter your institution name.');
    
    if (!emergencyContactName.trim() || !emergencyContactPhone.trim()) return setError('Please provide primary emergency contact details.');
    if (!age || isNaN(age)) return setError('Please enter a valid age.');
    if (!bloodGroup) return setError('Please select your blood group.');
    if (!homeAddress.trim()) return setError('Please enter your home address.');

    onComplete({
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      maritalStatus,
      partnerName: maritalStatus === 'Married' ? partnerName.trim() : '',
      partnerPhone: maritalStatus === 'Married' ? partnerPhone.trim() : '',
      momName: momName.trim(),
      momPhone: momPhone.trim(),
      dadName: dadName.trim(),
      dadPhone: dadPhone.trim(),
      schoolOffice: occupationType === 'None' ? 'None' : `${occupationType} - ${schoolOffice.trim()}`,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      age: parseInt(age, 10),
      bloodGroup,
      homeAddress: homeAddress.trim(),
      medicalInfo: medicalInfo.trim()
    });
  };

  const inputBase = "w-full rounded-xl px-4 py-3 font-dm text-sm text-sahas-text bg-sahas-dark border border-sahas-border transition-all outline-none focus:border-sahas-red";

  return (
    <div className="w-full relative min-h-screen bg-sahas-dark overflow-y-auto">
      {/* Fixed top blobs for aesthetics */}
      <div className="fixed top-0 left-0 right-0 h-64 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #00D68F 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #FF2D55 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 py-12 animate-scale-in">
        <div className="text-center mb-8">
          <span className="text-4xl mb-3 block">📋</span>
          <h1 className="font-syne font-bold text-3xl text-sahas-text">About You</h1>
          <p className="font-dm text-sahas-soft text-sm mt-2 leading-relaxed">
            Please complete your profile. This information is critical for your safety and medical preparedness.
          </p>
        </div>

        <div className="rounded-3xl p-6 shadow-xl bg-sahas-card border border-sahas-border mb-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            
            {/* 1. Identity */}
            <div className="space-y-4">
              <h2 className="text-xs font-syne font-bold text-sahas-text uppercase tracking-widest border-b border-sahas-border pb-2">Identity</h2>
              <div>
                <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setError(''); }}
                  placeholder="Your full name"
                  className={inputBase}
                />
              </div>
              <div>
                <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Mobile Number *</label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => { setMobileNumber(e.target.value); setError(''); }}
                  placeholder="Your mobile number"
                  className={inputBase}
                />
              </div>
            </div>

            {/* 2. Family Details */}
            <div className="space-y-4">
              <h2 className="text-xs font-syne font-bold text-sahas-text uppercase tracking-widest border-b border-sahas-border pb-2">Family Details</h2>
              
              <div className="animate-slide-up space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Mother Name *</label>
                    <input
                      type="text"
                      value={momName}
                      onChange={(e) => setMomName(e.target.value)}
                      placeholder="Mother's Name"
                      className={`${inputBase} px-3 py-2`}
                    />
                  </div>
                  <div>
                    <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Phone *</label>
                    <input
                      type="tel"
                      value={momPhone}
                      onChange={(e) => setMomPhone(e.target.value)}
                      placeholder="Mom's Number"
                      className={`${inputBase} px-3 py-2`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Father Name *</label>
                    <input
                      type="text"
                      value={dadName}
                      onChange={(e) => setDadName(e.target.value)}
                      placeholder="Father's Name"
                      className={`${inputBase} px-3 py-2`}
                    />
                  </div>
                  <div>
                    <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Phone *</label>
                    <input
                      type="tel"
                      value={dadPhone}
                      onChange={(e) => setDadPhone(e.target.value)}
                      placeholder="Dad's Number"
                      className={`${inputBase} px-3 py-2`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Marital Status *</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => { setMaritalStatus(e.target.value); setError(''); }}
                  className={inputBase}
                  style={{ appearance: 'none' }}
                >
                  <option value="" disabled>Select Status</option>
                  {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {maritalStatus === 'Married' && (
                <div className="animate-slide-up space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Partner Name *</label>
                      <input
                        type="text"
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        placeholder="Partner's Name"
                        className={`${inputBase} px-3 py-2`}
                      />
                    </div>
                    <div>
                      <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Phone *</label>
                      <input
                        type="tel"
                        value={partnerPhone}
                        onChange={(e) => setPartnerPhone(e.target.value)}
                        placeholder="Partner's Number"
                        className={`${inputBase} px-3 py-2`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Occupation */}
            <div className="space-y-4">
              <h2 className="text-xs font-syne font-bold text-sahas-text uppercase tracking-widest border-b border-sahas-border pb-2">Occupation</h2>
              <div>
                <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Occupation / Status *</label>
                <select
                  value={occupationType}
                  onChange={(e) => { setOccupationType(e.target.value); setError(''); }}
                  className={inputBase}
                  style={{ appearance: 'none' }}
                >
                  <option value="" disabled>Select Status</option>
                  {OCCUPATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              {occupationType && occupationType !== 'None' && (
                <div className="animate-slide-up">
                  <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">{occupationType} Name *</label>
                  <input
                    type="text"
                    value={schoolOffice}
                    onChange={(e) => { setSchoolOffice(e.target.value); setError(''); }}
                    placeholder={`Name of your ${occupationType?.toLowerCase()}`}
                    className={inputBase}
                  />
                </div>
              )}
            </div>

            {/* 4. Emergency Contact */}
            <div className="space-y-4">
              <h2 className="text-xs font-syne font-bold text-sahas-text uppercase tracking-widest border-b border-sahas-border pb-2">Primary Emergency Contact</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Name *</label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => { setEmergencyContactName(e.target.value); setError(''); }}
                    placeholder="Contact Name"
                    className={`${inputBase} px-3 py-2`}
                  />
                </div>
                <div>
                  <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Phone *</label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => { setEmergencyContactPhone(e.target.value); setError(''); }}
                    placeholder="Phone Number"
                    className={`${inputBase} px-3 py-2`}
                  />
                </div>
              </div>
            </div>

            {/* 5. Medical */}
            <div className="space-y-4">
              <h2 className="text-xs font-syne font-bold text-sahas-text uppercase tracking-widest border-b border-sahas-border pb-2">Medical & Location</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Age *</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => { setAge(e.target.value); setError(''); }}
                    placeholder="24"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Blood Group *</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => { setBloodGroup(e.target.value); setError(''); }}
                    className={inputBase}
                    style={{ appearance: 'none' }}
                  >
                    <option value="" disabled>Select</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Home Address *</label>
                <textarea
                  value={homeAddress}
                  onChange={(e) => { setHomeAddress(e.target.value); setError(''); }}
                  placeholder="Where do you live?"
                  className={`${inputBase} resize-none h-20`}
                />
              </div>
              <div>
                <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">Medical Info (Optional)</label>
                <textarea
                  value={medicalInfo}
                  onChange={(e) => setMedicalInfo(e.target.value)}
                  placeholder="Allergies, chronic conditions..."
                  className={`${inputBase} resize-none h-16`}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-shake mt-2">
                <p className="font-dm text-xs text-red-600">⚠️ {error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-xl font-syne font-bold text-sm text-white transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #00C4CC 0%, #00D68F 100%)',
                boxShadow: '0 4px 20px rgba(0,214,143,0.35)',
              }}
            >
              Confirm &amp; Proceed
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
