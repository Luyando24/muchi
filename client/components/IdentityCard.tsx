import React, { useState, useEffect } from "react";
import type { Resident } from "@shared/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, EyeOff, Shield, Sparkles, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";

interface Props {
  resident: Resident;
  className?: string;
  departmentName?: string;
  cardType?: 'military' | 'immigration' | 'national';
}

function initials(r: Resident) {
  const a = (r.firstName || "").trim()[0] || "";
  const b = (r.lastName || "").trim()[0] || "";
  const f = `${a}${b}`.toUpperCase();
  return f || r.nationalId.slice(0, 2).toUpperCase();
}

function maskNationalId(nationalId: string) {
  const clean = nationalId.replace(/\s+/g, "");
  if (clean.length < 4) return clean;
  return `${clean.slice(0, 3)}•••${clean.slice(-2)}`;
}

function getCardGradient(cardType: string) {
  switch (cardType) {
    case 'military':
      return 'from-blue-600 via-indigo-700 to-blue-800';
    case 'immigration':
      return 'from-green-600 via-emerald-700 to-green-800';
    default:
      return 'from-purple-600 via-violet-700 to-purple-800';
  }
}

function getCardTitle(cardType: string) {
  switch (cardType) {
    case 'military':
        return 'Military Identity Card';
    case 'immigration':
      return 'Immigration Identity Card';
    default:
      return 'National Identity Card';
  }
}

export default function IdentityCard({ 
  resident, 
  className, 
  departmentName: propDepartmentName,
  cardType = 'national'
}: Props) {
  const [showQrCode, setShowQrCode] = useState(false);
  const { session } = useAuth();
  const [departmentName, setDepartmentName] = useState(propDepartmentName || "Government Department");
  
  useEffect(() => {
    // Fetch department name from database if available
    const fetchDepartmentName = async () => {
      if (session?.departmentId) {
        const department = await db.departments.get(session.departmentId);
        if (department?.name) {
          setDepartmentName(department.name);
        }
      }
    };
    
    fetchDepartmentName();
  }, [session]);

  return (
    <Card
      className={cn(
        "digital-card w-full max-w-md overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative group hover:shadow-3xl transition-all duration-500 hover:scale-[1.02]",
        className
      )}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-cyan-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)]" style={{ backgroundSize: '20px 20px' }} />
      
      <div className="relative">
        {/* Header section with dynamic gradient */}
        <div className={cn("h-36 bg-gradient-to-br relative overflow-hidden", getCardGradient(cardType))}>
          {/* Animated shimmer effect */}
          <div className="shimmer-effect absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12" />
          
          {/* Government logo/chip */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <div className="h-8 w-12 rounded-md bg-gradient-to-r from-yellow-400 to-amber-500 shadow-lg flex items-center justify-center">
              {cardType === 'immigration' ? (
                <Globe className="h-4 w-4 text-slate-900" />
              ) : (
                <Shield className="h-4 w-4 text-slate-900" />
              )}
            </div>
          </div>
          
          {/* Identity Card text at top */}
          <div className="absolute top-4 left-6 text-white/90 z-10 max-w-[200px]">
            <div className="text-xs font-medium uppercase tracking-wider opacity-80">{getCardTitle(cardType)}</div>
            <div className="text-sm font-semibold truncate">{departmentName}</div>
          </div>
          
          {/* Sparkles icon for decoration */}
          <div className="absolute top-4 left-[180px] z-20">
            <Sparkles className="sparkle-icon h-3 w-3 text-white/90" />
          </div>
        </div>

        <CardContent className="pt-4 pb-6 px-6 relative">
          {/* Avatar and resident name */}
          <div className="relative -mt-20 mb-6 flex items-center">
            {/* Resident avatar */}
            <div className="float-element h-24 w-24 rounded-2xl bg-gradient-to-br from-white to-slate-100 shadow-xl ring-4 ring-white/20 backdrop-blur-sm grid place-items-center text-slate-800 font-bold text-2xl">
              {initials(resident)}
            </div>
            {/* Resident info */}
            <div className="ml-4">
              <div className="text-white drop-shadow-lg">
                <div className="text-2xl font-bold tracking-tight leading-tight truncate uppercase">
                  {[resident.firstName, resident.lastName]
                    .filter(Boolean)
                    .join(" ") || "Resident"}
                </div>
                <div className="text-sm text-white/80 font-medium">
                  {resident.nationality || 'Unknown'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            {/* QR Code section with modern styling */}
            <div className="relative">
              <div className="glow-effect rounded-2xl border border-white/10 p-4 bg-white/5 backdrop-blur-sm shadow-2xl">
                {resident.qrCode ? (
                  <img
                    src={resident.qrCode}
                    alt="Identity QR"
                    className={cn("h-36 w-36 rounded-lg transition-opacity duration-300", {
                      "opacity-0": !showQrCode
                    })}
                  />
                ) : (
                  <div className="h-36 w-36 bg-white/10 animate-pulse rounded-lg flex items-center justify-center">
                    <div className="text-white/50 text-sm">Loading QR...</div>
                  </div>
                )}
                {!showQrCode && resident.qrCode && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white/70 text-sm font-medium">QR Code Hidden</div>
                  </div>
                )}
              </div>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-xl -z-10" />
            </div>
            
            {/* Resident details with modern layout */}
            <div className="w-full space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2 p-3 rounded-xl glass-effect">
                  <div className="text-white/60 text-xs font-medium uppercase tracking-wider">National ID</div>
                  <div className="font-mono text-base tracking-wider text-white font-semibold">
                    {maskNationalId(resident.nationalId)}
                  </div>
                </div>
                <div className="space-y-2 p-3 rounded-xl glass-effect">
                  <div className="text-white/60 text-xs font-medium uppercase tracking-wider">Status</div>
                  <div className="font-mono text-white font-semibold">
                    {resident.residencyStatus || 'Active'}
                  </div>
                </div>
              </div>
              
              {resident.passportNumber && (
                <div className="space-y-2 p-3 rounded-xl glass-effect">
                  <div className="text-white/60 text-xs font-medium uppercase tracking-wider">Passport</div>
                  <div className="font-mono text-white font-semibold">
                    {resident.passportNumber}
                  </div>
                </div>
              )}
              
              {/* Action buttons with modern styling */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="modern-button flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 backdrop-blur-sm transition-all duration-300"
                  onClick={() => setShowQrCode(!showQrCode)}
                >
                  {showQrCode ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" /> Hide QR
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" /> Show QR
                    </>
                  )}
                </Button>
                
                <Button 
                  className={cn(
                    "modern-button flex-1 border-0 shadow-lg transition-all duration-300",
                    cardType === 'military' 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                      : cardType === 'immigration'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      : 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700'
                  )}
                  onClick={() => {
                    // Create a function to download the entire card as an image
                    const cardElement = document.querySelector('.digital-card');
                    if (cardElement) {
                      // Use html2canvas to capture the card (needs to be added to project dependencies)
                      import('html2canvas').then(html2canvas => {
                        html2canvas.default(cardElement).then(canvas => {
                          const link = document.createElement('a');
                          link.download = `identity-card-${resident.nationalId}.png`;
                          link.href = canvas.toDataURL('image/png');
                          link.click();
                        });
                      }).catch(err => {
                        console.error('Failed to load html2canvas:', err);
                        alert('Could not download card. Please try again later.');
                      });
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}