import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import { authAPI } from 'utils/api';
import { uploadImageToImageKit, fileToBase64 } from 'utils/imagekit';
import { useToast } from 'contexts/ToastContext';

const ProfileInformation = ({ userData, refreshUserData }) => {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // Store the actual file
  const [profileData, setProfileData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    businessType: 'E-commerce',
    country: 'United States',
    timezone: 'America/New_York',
    businessDescription: '',
    profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face'
  });

  // Debug log
  //console.log('🎯 ProfileInformation received userData:', userData);

  useEffect(() => {
    if (userData && typeof userData === 'object') {
      const updatedProfileData = {
        businessName: userData.businessName || userData.name || '',
        contactName: userData.name || '',
        email: userData.email || '',
        phone: userData.phoneNumber || '',
        website: userData.website || '',
        businessType: userData.businessType || 'E-commerce',
        country: userData.country || 'United States',
        timezone: userData.timeZone || 'America/New_York',
        businessDescription: userData.description || '',
        profileImage: userData.profileImage || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face'
      };
      //console.log('📝 Setting profile data:', updatedProfileData);
      setProfileData(updatedProfileData);
    }
  }, [userData]);

  const businessTypes = ['E-commerce', 'SaaS', 'Digital Services', 'Consulting', 'Retail', 'Manufacturing', 'Healthcare', 'Education', 'Other'];
  const timezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney'];

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Profile image must be less than 5MB', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file', 'error');
      return;
    }
    
    try {
      setSelectedFile(file);
      const base64Preview = await fileToBase64(file);
      setProfileData(prev => ({
        ...prev,
        profileImage: base64Preview
      }));
      //console.log('📷 Profile image selected, will upload on save');
    } catch (error) {
      console.error('❌ Error creating preview:', error);
      showToast('Failed to load image preview', 'error');
    }
  };

  const handleSave = async () => {
    if (!userData?.id) {
      showToast('User ID not found. Please log in again.', 'error');
      return;
    }

    setIsSaving(true);
    
    try {
      let finalProfileImageUrl = profileData.profileImage;

      if (selectedFile) {
        //console.log('📤 Uploading profile image to ImageKit...');
        setUploadingImage(true);
        
        const uploadResult = await uploadImageToImageKit(selectedFile, 'QuantumPay/profiles');
        
        if (uploadResult.success) {
          finalProfileImageUrl = uploadResult.url;
          //console.log('✅ Profile image uploaded to ImageKit:', uploadResult.url);
        } else {
          console.error('⚠️ ImageKit upload failed:', uploadResult.error);
          showToast(`Failed to upload profile image: ${uploadResult.error}. Saving other changes.`, 'warning');
          finalProfileImageUrl = userData.profileImage || '';
        }
        
        setUploadingImage(false);
      }

      const updateData = {
        name: profileData.contactName,
        businessName: profileData.businessName,
        website: profileData.website,
        phoneNumber: profileData.phone,
        country: profileData.country,
        businessType: profileData.businessType,
        timeZone: profileData.timezone,
        description: profileData.businessDescription,
        profileImage: finalProfileImageUrl
      };

      //console.log('💾 Saving profile with userId:', userData.id);
      const response = await authAPI.updateProfile(userData.id, updateData);
      
      if (response?.success) {
        setIsEditing(false);
        showToast('Profile updated successfully!', 'success');
        
        const updatedUserData = { ...userData, ...response.userData };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        localStorage.setItem('completeUserData', JSON.stringify(updatedUserData));
        
        setSelectedFile(null);
        window.location.reload();
      } else {
        showToast('Failed to update profile: ' + (response?.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile. Please check your connection and try again.', 'error');
    } finally {
      setIsSaving(false);
      setUploadingImage(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (userData) {
      setProfileData({
        businessName: userData.businessName || userData.name || '',
        contactName: userData.name || '',
        email: userData.email || '',
        phone: userData.phoneNumber || '',
        website: userData.website || '',
        businessType: userData.businessType || 'E-commerce',
        country: userData.country || 'United States',
        timezone: userData.timeZone || 'America/New_York',
        businessDescription: userData.description || '',
        profileImage: userData.profileImage || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary dark:text-white">Profile Information</h2>
          <p className="text-text-secondary dark:text-gray-400 mt-1">
            Manage your business details and contact information
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving || uploadingImage}
                className="px-4 py-2 border border-border dark:border-gray-600 rounded-lg text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || uploadingImage}
                className="px-4 py-2 bg-primary dark:bg-teal-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {(isSaving || uploadingImage) && <Icon name="Loader2" size={16} color="currentColor" className="animate-spin" />}
                <span>
                  {uploadingImage ? 'Uploading...' : isSaving ? 'Saving...' : 'Save Changes'}
                </span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-primary dark:bg-teal-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth flex items-center space-x-2"
            >
              <Icon name="Edit" size={16} color="currentColor" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Image */}
      <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Profile Photo</h3>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-secondary-100 dark:bg-gray-700">
              <Image src={profileData.profileImage} alt="Profile" className="w-full h-full object-cover" />
            </div>
            {isEditing && (
              <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary dark:bg-teal-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth">
                <Icon name="Camera" size={16} color="white" />
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
            {selectedFile && (
              <div className="absolute -bottom-8 left-0 text-xs text-blue-500 dark:text-blue-400 whitespace-nowrap">
                Will upload on save
              </div>
            )}
          </div>
          <div>
            <h4 className="font-medium text-text-primary dark:text-white">
              {profileData.contactName || 'No Name Set'}
            </h4>
            <p className="text-text-secondary dark:text-gray-400 text-sm">
              {profileData.businessName || 'No Business Name Set'}
            </p>
            {isEditing && (
              <p className="text-xs text-text-secondary dark:text-gray-500 mt-2">
                {uploadingImage 
                  ? 'Uploading image...' 
                  : 'Click the camera icon to upload a new photo. Recommended size: 400x400px'
                }
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Business Name *</label>
            <input
              type="text"
              value={profileData.businessName}
              onChange={(e) => handleInputChange('businessName', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white disabled:opacity-50"
              placeholder="Your business name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Contact Name *</label>
            <input
              type="text"
              value={profileData.contactName}
              onChange={(e) => handleInputChange('contactName', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white disabled:opacity-50"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Email Address *</label>
            <input
              type="email"
              value={profileData.email}
              disabled
              className="w-full px-3 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white disabled:opacity-50"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Phone Number</label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white disabled:opacity-50"
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Website</label>
            <input
              type="url"
              value={profileData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white disabled:opacity-50"
              placeholder="https://yourwebsite.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Business Type</label>
            <select
              value={profileData.businessType}
              onChange={(e) => handleInputChange('businessType', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white disabled:opacity-50"
            >
              {businessTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Country</label>
            <input
              type="text"
              value={profileData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white disabled:opacity-50"
              placeholder="United States"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Timezone</label>
            <select
              value={profileData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white disabled:opacity-50"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Business Description</label>
            <textarea
              value={profileData.businessDescription}
              onChange={(e) => handleInputChange('businessDescription', e.target.value)}
              disabled={!isEditing}
              rows={3}
              className="w-full px-3 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white disabled:opacity-50 resize-none"
              placeholder="Tell us about your business"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileInformation;
