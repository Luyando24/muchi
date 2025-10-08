import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Api } from "@/lib/api";
import { db } from "@/lib/db";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, User, FileText, Heart } from "lucide-react";
import { handleError, validateNRC, validateRequired } from "@/lib/errors";
import type { PatientRegistrationRequest } from "@shared/api";

type RegistrationStep = 'search' | 'basic' | 'contact' | 'medical';

export default function PatientSearch() {
  const [step, setStep] = useState<RegistrationStep>('search');
  const [nrc, setNrc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingPatient, setExistingPatient] = useState(false);
  const navigate = useNavigate();

  // Registration form data
  const [formData, setFormData] = useState<PatientRegistrationRequest>({
    nrc: "",
    firstName: "",
    lastName: "",
    gender: undefined,
    dob: "",
    phone: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    occupation: "",
    maritalStatus: undefined,
    bloodType: undefined,
    allergies: "",
    medicalHistory: "",
    familyHistory: "",
    insuranceInfo: ""
  });

  const searchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      validateRequired(nrc, "NRC");
      
      if (!validateNRC(nrc)) {
        throw new Error("Invalid NRC format. Expected format: XXXXXX/XX/X");
      }
      
      const res = await Api.searchPatient({ nrc });
      if (res.patient) {
        setExistingPatient(true);
        navigate(`/clinic/patient/${res.patient.id}`);
      } else {
        // Patient not found, start registration process
        setFormData(prev => ({ ...prev, nrc }));
        setStep('basic');
      }
    } catch (e: any) {
      const errorMessage = String(e?.message || e);
      setError(errorMessage);
      handleError(e, "Patient Search");
    } finally {
      setLoading(false);
    }
  };

  const registerPatient = async () => {
    setLoading(true);
    try {
      const response = await Api.registerPatient(formData);
      // Store the patient in local database for immediate access
      await db.patients.put(response.patient);
      
      // Show success notification
      toast({
        title: "Registration Successful!",
        description: `Patient ${formData.firstName} ${formData.lastName} has been registered successfully.`,
        variant: "default",
      });
      
      navigate(`/clinic/patient/${response.patient.id}`);
    } catch (e: any) {
      const errorMessage = String(e?.message || e);
      setError(errorMessage);
      handleError(e, "Patient Registration");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 'basic') setStep('contact');
    else if (step === 'contact') setStep('medical');
  };

  const prevStep = () => {
    if (step === 'contact') setStep('basic');
    else if (step === 'medical') setStep('contact');
    else if (step === 'basic') setStep('search');
  };

  const updateFormData = (field: keyof PatientRegistrationRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStepValid = () => {
    switch (step) {
      case 'basic':
        return formData.firstName && formData.lastName;
      case 'contact':
        return true; // Contact info is optional
      case 'medical':
        return true; // Medical info is optional
      default:
        return true;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'search': return 'Search Patient by NRC';
      case 'basic': return 'Basic Information';
      case 'contact': return 'Contact Information';
      case 'medical': return 'Medical Information';
      default: return 'Patient Registration';
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case 'basic': return <User className="h-5 w-5" />;
      case 'contact': return <FileText className="h-5 w-5" />;
      case 'medical': return <Heart className="h-5 w-5" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 flex items-start justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            {getStepIcon()}
            <CardTitle>{getStepTitle()}</CardTitle>
          </div>
          {step !== 'search' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>NRC: {formData.nrc}</span>
              <span>•</span>
              <span>Step {step === 'basic' ? '1' : step === 'contact' ? '2' : '3'} of 3</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {step === 'search' && (
            <form className="space-y-4" onSubmit={searchPatient}>
              <div className="space-y-2">
                <label htmlFor="nrc" className="text-sm font-medium">
                  National Registration Card (NRC)
                </label>
                <Input
                  id="nrc"
                  value={nrc}
                  onChange={(e) => setNrc(e.target.value)}
                  placeholder="e.g., 123456/78/9"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the patient's NRC to search for existing records or start registration.
                </p>
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  "Search / Register Patient"
                )}
              </Button>
            </form>
          )}

          {step === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name *</label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => updateFormData('firstName', e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name *</label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => updateFormData('lastName', e.target.value)}
                    placeholder="Mwanza"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Gender</label>
                  <Select value={formData.gender} onValueChange={(value) => updateFormData('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => updateFormData('dob', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    placeholder="+260 97 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Occupation</label>
                  <Input
                    value={formData.occupation}
                    onChange={(e) => updateFormData('occupation', e.target.value)}
                    placeholder="Teacher, Farmer, etc."
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => updateFormData('address', e.target.value)}
                  placeholder="House number, street, compound, district"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emergency Contact Name</label>
                  <Input
                    value={formData.emergencyContactName}
                    onChange={(e) => updateFormData('emergencyContactName', e.target.value)}
                    placeholder="Next of kin"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emergency Contact Phone</label>
                  <Input
                    value={formData.emergencyContactPhone}
                    onChange={(e) => updateFormData('emergencyContactPhone', e.target.value)}
                    placeholder="+260 97 123 4567"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Marital Status</label>
                <Select value={formData.maritalStatus} onValueChange={(value) => updateFormData('maritalStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 'medical' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Blood Type</label>
                <Select value={formData.bloodType} onValueChange={(value) => updateFormData('bloodType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Known Allergies</label>
                <Textarea
                  value={formData.allergies}
                  onChange={(e) => updateFormData('allergies', e.target.value)}
                  placeholder="List any known allergies (medications, food, environmental)"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Medical History</label>
                <Textarea
                  value={formData.medicalHistory}
                  onChange={(e) => updateFormData('medicalHistory', e.target.value)}
                  placeholder="Previous surgeries, chronic conditions, medications"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Family Health History</label>
                <Textarea
                  value={formData.familyHistory}
                  onChange={(e) => updateFormData('familyHistory', e.target.value)}
                  placeholder="Family history of diabetes, hypertension, heart disease, etc."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Insurance Information</label>
                <Textarea
                  value={formData.insuranceInfo}
                  onChange={(e) => updateFormData('insuranceInfo', e.target.value)}
                  placeholder="Insurance provider, policy number, coverage details"
                  rows={2}
                />
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}

          {step !== 'search' && (
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              {step === 'medical' ? (
                <Button onClick={registerPatient} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </Button>
              ) : (
                <Button onClick={nextStep} disabled={!isStepValid()}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
