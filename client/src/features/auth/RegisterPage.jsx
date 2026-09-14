import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Cpu,
  UserCheck,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { LightParticleBackground } from '../../components/common/LightParticleBackground';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [role, setRole] = useState('CITIZEN'); // OFFICER, FIELD_OFFICER, CITIZEN
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  // Officer fields
  const [officialId, setOfficialId] = useState('');
  const [department, setDepartment] = useState('SDMA');
  const [designation, setDesignation] = useState('');
  const [district, setDistrict] = useState('East Khasi Hills');
  const [districtId, setDistrictId] = useState('EKH');

  // Field Officer fields
  const [employeeId, setEmployeeId] = useState('');
  const [subRole, setSubRole] = useState('ROAD_INSPECTOR');
  const [assignedBlock, setAssignedBlock] = useState('Sohra Sub-Division');

  // Citizen fields
  const [village, setVillage] = useState('Sohra');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const payload = {
      name,
      phone,
      email: email || undefined,
      password,
      role,
      preferredLanguage,
      jurisdiction: {
        state: districtId === 'DH' ? 'Assam' : 'Meghalaya',
        district,
        districtId,
        village: role === 'CITIZEN' ? village : undefined,
      },
    };

    if (role === 'OFFICER') {
      payload.officerDetails = {
        officialId,
        department,
        designation,
      };
    } else if (role === 'FIELD_OFFICER') {
      payload.fieldOfficerDetails = {
        employeeId,
        subRole,
        assignedBlock,
      };
    } else if (role === 'CITIZEN') {
      payload.citizenDetails = {
        village,
        approxLocation: {
          type: 'Point',
          coordinates: [91.7324, 25.2986],
        },
      };
    }

    try {
      const res = await register(payload);
      if (res.status === 'PENDING_APPROVAL') {
        setSuccessInfo({
          title: 'Official Account Pending Verification',
          message:
            'Your Officer account has been registered with EOC records and is awaiting verification by Super-Admin before active alert authority is granted.',
        });
      } else {
        navigate('/citizen/home');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#deecfc] via-[#eaf2fc] to-[#f5f9ff] text-neutral-900 flex items-center justify-center p-4 sm:p-6 lg:p-10 select-none relative overflow-hidden">
      <LightParticleBackground />

      {/* 2-Panel Desktop Container with Standardized Max-Width (1280px) */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10">
        {/* LEFT PANEL: Branding & Registration Guidance */}
        <div className="lg:col-span-5 space-y-6 pt-2 pb-4">
          {/* Unclipped RAKSHA-NER Shield Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full bg-[#e6f1fb] border border-sky-100 flex items-center justify-center text-sky-600 shadow-sm shrink-0">
              <Shield className="w-8 h-8 text-sky-600" />
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-[-0.6px] block">
                RAKSHA-NER
              </span>
              <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider font-mono">
                Official Account Registration
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-[-0.6px] leading-snug">
              Join the North East Disaster Response Network
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Create an official account for certified disaster management, field inspections, or community hazard reporting.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-white shadow-md border border-sky-100/40 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-sky-800 uppercase tracking-wider text-[11px] font-mono">
                  Disaster Officer (EOC Command)
                </span>
              </div>
              <p className="text-neutral-600 text-[11px] pl-8">
                Requires department badge verification to dispatch sirens and cell broadcasts.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white shadow-md border border-sky-100/40 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-sky-800 uppercase tracking-wider text-[11px] font-mono">
                  Field Officer (Inspection)
                </span>
              </div>
              <p className="text-neutral-600 text-[11px] pl-8">
                Assigned to sub-divisions for ground shear verification and lifeline road reporting.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white shadow-md border border-sky-100/40 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#e6f1fb] flex items-center justify-center text-sky-600 shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-sky-800 uppercase tracking-wider text-[11px] font-mono">
                  Citizen (Community Warning)
                </span>
              </div>
              <p className="text-neutral-600 text-[11px] pl-8">
                Instant activation for local hazard push alerts, offline reporting, and SOS distress beacons.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Registration Form */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-sky-100/50">
            {successInfo ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600 shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 tracking-[-0.4px]">{successInfo.title}</h3>
                <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                  {successInfo.message}
                </p>
                <div className="pt-4">
                  <Link
                    to="/login"
                    className="inline-flex items-center px-6 py-2.5 rounded-full bg-[#171717] hover:bg-neutral-800 text-white text-xs font-semibold transition-colors"
                  >
                    Return to Portal Login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
                <div className="border-b border-neutral-200 pb-3">
                  <h2 className="text-xl font-semibold text-neutral-900 tracking-[-0.4px]">Create Account</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Fill in your identity details and designated jurisdiction
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Portal Role Selector */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Account Type / Operational Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                  >
                    <option value="CITIZEN">Citizen (Village Resident / Public)</option>
                    <option value="FIELD_OFFICER">Field Officer (Ground Inspection / Verification)</option>
                    <option value="OFFICER">District / State Disaster Officer (Control Room)</option>
                  </select>
                </div>

                {/* Common Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Banlumlang Khongwir"
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs sm:text-sm focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Phone Number (Primary ID)</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs sm:text-sm focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@sdma.gov.in"
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs sm:text-sm focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Preferred Language</label>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs sm:text-sm focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिंदी (Hindi)</option>
                      <option value="as">অসমীয়া (Assamese)</option>
                      <option value="bn">বাংলা (Bengali)</option>
                      <option value="ne">नेपाली (Nepali)</option>
                      <option value="kha">Khasi</option>
                    </select>
                  </div>
                </div>

                {/* Dynamic Role Sections */}
                {role === 'OFFICER' && (
                  <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-800">
                      <Building2 className="w-4 h-4" />
                      <span>Disaster Officer Credentials</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-700 mb-1">Official ID / Gov Badge</label>
                        <input
                          type="text"
                          required
                          value={officialId}
                          onChange={(e) => setOfficialId(e.target.value)}
                          placeholder="SDMA-MEG-014"
                          className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-700 mb-1">Department</label>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                        >
                          <option value="SDMA">SDMA (State Disaster Mgmt)</option>
                          <option value="DDMA">DDMA (District Disaster Mgmt)</option>
                          <option value="MDoNER">MDoNER</option>
                          <option value="NDMA">NDMA</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-700 mb-1">Designation</label>
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="EOC Operations Officer"
                          className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-700 mb-1">District Jurisdiction</label>
                        <select
                          value={districtId}
                          onChange={(e) => {
                            setDistrictId(e.target.value);
                            setDistrict(e.target.value === 'DH' ? 'Dima Hasao' : 'East Khasi Hills');
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                        >
                          <option value="EKH">East Khasi Hills (Meghalaya)</option>
                          <option value="DH">Dima Hasao (Assam)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {role === 'FIELD_OFFICER' && (
                  <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-800">
                      <User className="w-4 h-4" />
                      <span>Field Officer Inspection Profile</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-700 mb-1">Employee ID</label>
                        <input
                          type="text"
                          required
                          value={employeeId}
                          onChange={(e) => setEmployeeId(e.target.value)}
                          placeholder="FLD-EKH-104"
                          className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-700 mb-1">Specialization</label>
                        <select
                          value={subRole}
                          onChange={(e) => setSubRole(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                        >
                          <option value="ROAD_INSPECTOR">Road & Slope Inspector</option>
                          <option value="VILLAGE_LIAISON">Village Liaison</option>
                          <option value="RESCUE_TEAM">Rescue Rapid Response</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {role === 'CITIZEN' && (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                      <MapPin className="w-4 h-4" />
                      <span>Village Location (For Early Warnings)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-700 mb-1">District</label>
                        <select
                          value={districtId}
                          onChange={(e) => {
                            setDistrictId(e.target.value);
                            setDistrict(e.target.value === 'DH' ? 'Dima Hasao' : 'East Khasi Hills');
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                        >
                          <option value="EKH">East Khasi Hills (Meghalaya)</option>
                          <option value="DH">Dima Hasao (Assam)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-700 mb-1">Village / Locality</label>
                        <input
                          type="text"
                          required
                          value={village}
                          onChange={(e) => setVillage(e.target.value)}
                          placeholder="e.g. Sohra / Cherrapunji"
                          className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs sm:text-sm focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs sm:text-sm focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-full bg-[#171717] hover:bg-neutral-800 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </button>

                <div className="text-center pt-2">
                  <Link to="/login" className="text-xs text-sky-700 hover:text-sky-900 font-semibold">
                    Already registered? Back to Portal Login →
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
