import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  TextInput, 
  Alert 
} from 'react-native';
import { useAuth } from '../../../../hooks/useAuth';
import { supabase } from '../../../../lib/supabase';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { 
  BookText, 
  Users, 
  Award, 
  Save, 
  Send, 
  ChevronDown, 
  ClipboardList, 
  TrendingUp, 
  BarChart2, 
  CheckCircle2 
} from 'lucide-react-native';

interface SchoolClass {
  id: string;
  name: string;
  section: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Student {
  id: string;
  full_name: string;
  student_number: string;
}

interface GradeEntry {
  studentId: string;
  fullName: string;
  studentNumber: string;
  percentage: string;
  comments: string;
  status?: string;
}

interface SchoolSettings {
  academic_year: string;
  current_term: string;
}

export default function GradebookScreen() {
  const { session, user } = useAuth();
  
  // Tab: 'entry' or 'analysis'
  const [activeSubTab, setActiveSubTab] = useState<'entry' | 'analysis'>('entry');
  
  // Selection states
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  
  const [academicYear, setAcademicYear] = useState<string>('2026');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [selectedExamType, setSelectedExamType] = useState<string>('End of Term');
  
  // Loading & Action states
  const [loadingSelections, setLoadingSelections] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);
  const [submittingGrades, setSubmittingGrades] = useState(false);

  // Student list and entered scores
  const [roster, setRoster] = useState<GradeEntry[]>([]);

  // Selection Dropdown toggles
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showTermDropdown, setShowTermDropdown] = useState(false);
  const [showExamDropdown, setShowExamDropdown] = useState(false);

  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const examTypes = ['Test 1', 'Test 2', 'Mid-Term', 'End of Term'];

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = session?.access_token;
    if (!token) throw new Error('No session');

    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || errBody.error || `API error: ${response.status}`);
    }

    return response.json();
  };

  // Load classes, subjects, and settings on mount
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingSelections(true);
        
        // 1. Fetch School Settings
        const settings: SchoolSettings = await fetchWithAuth('/api/school/settings').catch(() => ({
          academic_year: '2026',
          current_term: 'Term 1'
        }));
        if (settings) {
          setAcademicYear(settings.academic_year);
          setSelectedTerm(settings.current_term);
        }

        // 2. Fetch Classes
        const classesData: SchoolClass[] = await fetchWithAuth('/api/teacher/classes');
        setClasses(classesData || []);
        if (classesData && classesData.length > 0) {
          setSelectedClassId(classesData[0].id);
        }

        // 3. Fetch Subjects
        const subjectsData: Subject[] = await fetchWithAuth('/api/teacher/subjects');
        setSubjects(subjectsData || []);
        if (subjectsData && subjectsData.length > 0) {
          setSelectedSubjectId(subjectsData[0].id);
        }

      } catch (error) {
        console.error('Gradebook initialization error:', error);
        Alert.alert('Error', 'Failed to load teaching assignments.');
      } finally {
        setLoadingSelections(false);
      }
    };

    initData();
  }, []);

  // Fetch student roster and existing grades whenever selections change
  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      fetchRosterAndGrades();
    }
  }, [selectedClassId, selectedSubjectId, selectedTerm, selectedExamType]);

  const fetchRosterAndGrades = async () => {
    try {
      setLoadingRoster(true);
      
      // 1. Fetch Class Roster
      const studentsData: Student[] = await fetchWithAuth(`/api/school/classes/${selectedClassId}/students?year=${academicYear}`);
      
      if (!studentsData || studentsData.length === 0) {
        setRoster([]);
        setLoadingRoster(false);
        return;
      }

      // 2. Fetch Existing Grades
      const studentIds = studentsData.map(s => s.id).join(',');
      const gradesData = await fetchWithAuth(
        `/api/school/grades/batch?subjectId=${selectedSubjectId}&term=${encodeURIComponent(selectedTerm)}&examType=${encodeURIComponent(selectedExamType)}&academicYear=${academicYear}&studentIds=${studentIds}`
      ).catch(() => []);

      const gradeMap = new Map(gradesData?.map((g: any) => [g.student_id, g]));

      // 3. Build Roster Entries
      const newRoster: GradeEntry[] = studentsData.map(s => {
        const exist = gradeMap.get(s.id) as any;
        return {
          studentId: s.id,
          fullName: s.full_name,
          studentNumber: s.student_number,
          percentage: exist && exist.percentage !== null && exist.grade !== 'ABSENT' ? exist.percentage.toString() : '',
          comments: exist?.comments || '',
          status: exist?.status || 'Draft'
        };
      });

      setRoster(newRoster);

    } catch (error) {
      console.error('Error loading class roster/grades:', error);
      Alert.alert('Error', 'Failed to load class roster and grades.');
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleScoreChange = (studentId: string, text: string) => {
    // Allow digits and a single decimal point
    let sanitized = text.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }

    if (sanitized !== '') {
      const floatVal = parseFloat(sanitized);
      if (!isNaN(floatVal)) {
        let pct = Math.round(floatVal);
        if (pct < 0 || pct > 100) return;
        if (sanitized.includes('.') && floatVal % 1 !== 0) {
          sanitized = pct.toString();
        }
      }
    }

    setRoster(prev => prev.map(s => s.studentId === studentId ? { ...s, percentage: sanitized } : s));
  };

  const handleSaveGrades = async () => {
    if (roster.length === 0) return;
    setSavingGrades(true);
    
    try {
      const gradesPayload = roster.map(r => ({
        studentId: r.studentId,
        subjectId: selectedSubjectId,
        term: selectedTerm,
        examType: selectedExamType,
        academicYear,
        percentage: r.percentage === '' ? null : parseInt(r.percentage),
        comments: r.comments
      }));

      await fetchWithAuth('/api/school/grades/batch', {
        method: 'POST',
        body: JSON.stringify({ grades: gradesPayload })
      });

      Alert.alert('Success', 'Grades draft saved successfully!');
      // Refresh to update status badges
      fetchRosterAndGrades();

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save grades draft.');
    } finally {
      setSavingGrades(false);
    }
  };

  const handleSubmitGrades = async () => {
    if (roster.length === 0) return;
    
    Alert.alert(
      'Submit Results',
      'Are you sure you want to submit these results to the administration? Once submitted, you cannot modify draft scores without admin approval.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmittingGrades(true);
            try {
              // 1. Save current state first
              const gradesPayload = roster.map(r => ({
                studentId: r.studentId,
                subjectId: selectedSubjectId,
                term: selectedTerm,
                examType: selectedExamType,
                academicYear,
                percentage: r.percentage === '' ? null : parseInt(r.percentage),
                comments: r.comments
              }));

              await fetchWithAuth('/api/school/grades/batch', {
                method: 'POST',
                body: JSON.stringify({ grades: gradesPayload })
              });

              // 2. Submit to admin
              await fetchWithAuth('/api/school/results/submit', {
                method: 'POST',
                body: JSON.stringify({
                  term: selectedTerm,
                  examType: selectedExamType,
                  academicYear,
                  classId: selectedClassId,
                  subjectId: selectedSubjectId
                })
              });

              Alert.alert('Submitted', 'Grades officially submitted to admin successfully!');
              fetchRosterAndGrades();

            } catch (error: any) {
              Alert.alert('Submit Error', error.message || 'Failed to submit results.');
            } finally {
              setSubmittingGrades(false);
            }
          }
        }
      ]
    );
  };

  // Performance calculations for analysis
  const calculateAnalysis = () => {
    const scores = roster
      .map(r => r.percentage !== '' ? parseInt(r.percentage) : null)
      .filter((s): s is number => s !== null);

    if (scores.length === 0) {
      return { average: 0, highest: 0, lowest: 0, passRate: 0, total: 0 };
    }

    const total = scores.length;
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = Math.round(sum / total);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    
    // Zambian pass grade is usually >= 40% (Pass or higher standard)
    const passes = scores.filter(s => s >= 40).length;
    const passRate = Math.round((passes / total) * 100);

    return { average, highest, lowest, passRate, total };
  };

  const analysis = calculateAnalysis();

  if (loadingSelections) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <View className="px-5 py-4 border-b border-slate-100 bg-white flex-row justify-between items-center">
        <Text className="text-xl font-extrabold text-slate-900">Gradebook Portal</Text>
        
        {/* Toggle between Mark Entry and Analysis */}
        <View className="bg-slate-100 p-0.5 rounded-lg flex-row gap-0.5 shadow-sm">
          <TouchableOpacity 
            onPress={() => setActiveSubTab('entry')}
            className={`px-3 py-1.5 rounded-md ${activeSubTab === 'entry' ? 'bg-white shadow-xs' : ''}`}
          >
            <Text className={`text-[10px] font-bold uppercase ${activeSubTab === 'entry' ? 'text-indigo-600' : 'text-slate-500'}`}>Scores</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveSubTab('analysis')}
            className={`px-3 py-1.5 rounded-md ${activeSubTab === 'analysis' ? 'bg-white shadow-xs' : ''}`}
          >
            <Text className={`text-[10px] font-bold uppercase ${activeSubTab === 'analysis' ? 'text-indigo-600' : 'text-slate-500'}`}>Analysis</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Roster & entries view */}
      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {/* Filter selection widgets */}
        <Card className="bg-white border-slate-100 shadow-sm p-4 mb-6 space-y-3">
          <View className="flex-row gap-3">
            {/* Class Dropdown */}
            <View className="flex-1 relative">
              <Text className="text-[9px] font-bold text-slate-400 uppercase mb-1 ml-0.5">Class</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowClassDropdown(!showClassDropdown);
                  setShowSubjectDropdown(false);
                  setShowTermDropdown(false);
                  setShowExamDropdown(false);
                }}
                className="bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-xl flex-row justify-between items-center"
              >
                <Text className="text-xs font-bold text-slate-700 truncate">{selectedClass?.name || 'Class'}</Text>
                <ChevronDown size={14} color="#64748b" />
              </TouchableOpacity>
              {showClassDropdown && (
                <View className="absolute top-14 left-0 right-0 bg-white border border-slate-100 rounded-xl shadow-lg z-30">
                  {classes.map(c => (
                    <TouchableOpacity 
                      key={c.id} 
                      onPress={() => {
                        setSelectedClassId(c.id);
                        setShowClassDropdown(false);
                      }}
                      className="p-3 border-b border-slate-50 last:border-0"
                    >
                      <Text className="text-xs font-bold text-slate-600">{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Subject Dropdown */}
            <View className="flex-1 relative">
              <Text className="text-[9px] font-bold text-slate-400 uppercase mb-1 ml-0.5">Subject</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowSubjectDropdown(!showSubjectDropdown);
                  setShowClassDropdown(false);
                  setShowTermDropdown(false);
                  setShowExamDropdown(false);
                }}
                className="bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-xl flex-row justify-between items-center"
              >
                <Text className="text-xs font-bold text-slate-700 truncate">{selectedSubject?.name || 'Subject'}</Text>
                <ChevronDown size={14} color="#64748b" />
              </TouchableOpacity>
              {showSubjectDropdown && (
                <View className="absolute top-14 left-0 right-0 bg-white border border-slate-100 rounded-xl shadow-lg z-30">
                  {subjects.map(s => (
                    <TouchableOpacity 
                      key={s.id} 
                      onPress={() => {
                        setSelectedSubjectId(s.id);
                        setShowSubjectDropdown(false);
                      }}
                      className="p-3 border-b border-slate-50 last:border-0"
                    >
                      <Text className="text-xs font-bold text-slate-600">{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View className="flex-row gap-3">
            {/* Term Dropdown */}
            <View className="flex-1 relative">
              <Text className="text-[9px] font-bold text-slate-400 uppercase mb-1 ml-0.5">Term</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowTermDropdown(!showTermDropdown);
                  setShowClassDropdown(false);
                  setShowSubjectDropdown(false);
                  setShowExamDropdown(false);
                }}
                className="bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-xl flex-row justify-between items-center"
              >
                <Text className="text-xs font-bold text-slate-700">{selectedTerm}</Text>
                <ChevronDown size={14} color="#64748b" />
              </TouchableOpacity>
              {showTermDropdown && (
                <View className="absolute top-14 left-0 right-0 bg-white border border-slate-100 rounded-xl shadow-lg z-30">
                  {terms.map(t => (
                    <TouchableOpacity 
                      key={t} 
                      onPress={() => {
                        setSelectedTerm(t);
                        setShowTermDropdown(false);
                      }}
                      className="p-3 border-b border-slate-50 last:border-0"
                    >
                      <Text className="text-xs font-bold text-slate-600">{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Assessment Dropdown */}
            <View className="flex-1 relative">
              <Text className="text-[9px] font-bold text-slate-400 uppercase mb-1 ml-0.5">Assessment Type</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowExamDropdown(!showExamDropdown);
                  setShowClassDropdown(false);
                  setShowSubjectDropdown(false);
                  setShowTermDropdown(false);
                }}
                className="bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-xl flex-row justify-between items-center"
              >
                <Text className="text-xs font-bold text-slate-700">{selectedExamType}</Text>
                <ChevronDown size={14} color="#64748b" />
              </TouchableOpacity>
              {showExamDropdown && (
                <View className="absolute top-14 left-0 right-0 bg-white border border-slate-100 rounded-xl shadow-lg z-30">
                  {examTypes.map(e => (
                    <TouchableOpacity 
                      key={e} 
                      onPress={() => {
                        setSelectedExamType(e);
                        setShowExamDropdown(false);
                      }}
                      className="p-3 border-b border-slate-50 last:border-0"
                    >
                      <Text className="text-xs font-bold text-slate-600">{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* loading indicator */}
        {loadingRoster ? (
          <View className="py-20">
            <ActivityIndicator size="small" color="#4f46e5" />
          </View>
        ) : (
          <>
            {/* ==================== SUBTAB: MARK ENTRY ==================== */}
            {activeSubTab === 'entry' && (
              <View className="space-y-4 mb-20">
                {roster.length > 0 ? (
                  <>
                    <View className="flex-row justify-between items-center px-1 mb-1">
                      <Text className="text-xs font-extrabold text-slate-500">{roster.length} Students Listed</Text>
                      <Text className="text-[10px] font-black text-slate-400 uppercase">Year: {academicYear}</Text>
                    </View>
                    <View className="px-1 mb-2">
                      <Text className="text-[9px] text-slate-400 font-bold italic">
                        Note: Decimal marks will be automatically rounded to the nearest integer.
                      </Text>
                    </View>

                    {roster.map((student) => (
                      <Card key={student.studentId} className="bg-white border-slate-100 shadow-sm p-4">
                        <View className="flex-row justify-between items-center">
                          <View className="flex-1 mr-4">
                            <Text className="font-extrabold text-slate-800 text-sm leading-snug">{student.fullName}</Text>
                            <View className="flex-row items-center gap-2 mt-1">
                              <Text className="text-[9px] text-slate-400 font-bold uppercase">{student.studentNumber}</Text>
                              <View className={`px-1.5 py-0.5 rounded-full ${student.status === 'Published' ? 'bg-emerald-50' : student.status === 'Submitted' ? 'bg-blue-50' : 'bg-slate-50'}`}>
                                <Text className={`text-[7px] font-bold uppercase ${student.status === 'Published' ? 'text-emerald-700' : student.status === 'Submitted' ? 'text-blue-700' : 'text-slate-500'}`}>
                                  {student.status || 'Draft'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View className="w-18 flex-row items-center bg-slate-50 border border-slate-100 rounded-xl px-2">
                            <TextInput 
                              placeholder="--"
                              keyboardType="numeric"
                              value={student.percentage}
                              onChangeText={(text) => handleScoreChange(student.studentId, text)}
                              editable={student.status !== 'Submitted' && student.status !== 'Published'}
                              className="flex-1 text-center font-black text-slate-800 text-sm h-10"
                            />
                            <Text className="text-[10px] text-slate-400 font-bold">%</Text>
                          </View>
                        </View>
                      </Card>
                    ))}

                    {/* Actions block at the bottom of the list */}
                    {roster.every(r => r.status !== 'Submitted' && r.status !== 'Published') ? (
                      <View className="flex-row gap-3 mt-4">
                        <TouchableOpacity 
                          onPress={handleSaveGrades}
                          disabled={savingGrades}
                          className="flex-1 bg-white border border-slate-200 h-12 rounded-xl flex-row items-center justify-center gap-2 shadow-xs"
                        >
                          {savingGrades ? (
                            <ActivityIndicator color="#4f46e5" />
                          ) : (
                            <>
                              <Save size={16} color="#4f46e5" />
                              <Text className="text-indigo-600 font-black uppercase text-[10px] tracking-wider">Save Draft</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={handleSubmitGrades}
                          disabled={submittingGrades}
                          className="flex-1 bg-indigo-600 h-12 rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
                        >
                          {submittingGrades ? (
                            <ActivityIndicator color="white" />
                          ) : (
                            <>
                              <Send size={16} color="white" />
                              <Text className="text-white font-black uppercase text-[10px] tracking-wider">Submit Admin</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Card className="bg-slate-50 border-slate-100 p-4 items-center">
                        <View className="flex-row items-center gap-2">
                          <CheckCircle2 size={16} color="#10b981" />
                          <Text className="text-slate-600 font-bold text-xs">Grades Submitted & Locked</Text>
                        </View>
                      </Card>
                    )}
                  </>
                ) : (
                  <View className="py-20 items-center justify-center">
                    <Users size={48} color="#cbd5e1" />
                    <Text className="text-slate-400 font-bold mt-4">No Students Enrolled</Text>
                    <Text className="text-slate-400 text-[10px] mt-1 text-center">There are no students enrolled in this class for the active year.</Text>
                  </View>
                )}
              </View>
            )}

            {/* ==================== SUBTAB: PERFORMANCE ANALYSIS ==================== */}
            {activeSubTab === 'analysis' && (
              <View className="space-y-6 mb-20">
                {roster.length > 0 ? (
                  <>
                    {/* Key Stats Cards */}
                    <View className="flex-row gap-4">
                      <Card className="flex-1 bg-white border-slate-100 shadow-sm">
                        <CardContent className="items-center py-4">
                          <TrendingUp size={22} color="#4f46e5" className="mb-1" />
                          <Text className="text-2xl font-black text-slate-800">{analysis.average}%</Text>
                          <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg. Score</Text>
                        </CardContent>
                      </Card>

                      <Card className="flex-1 bg-white border-slate-100 shadow-sm">
                        <CardContent className="items-center py-4">
                          <Award size={22} color="#10b981" className="mb-1" />
                          <Text className="text-2xl font-black text-slate-800">{analysis.highest}%</Text>
                          <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Max Score</Text>
                        </CardContent>
                      </Card>

                      <Card className="flex-1 bg-white border-slate-100 shadow-sm">
                        <CardContent className="items-center py-4">
                          <BarChart2 size={22} color="#f59e0b" className="mb-1" />
                          <Text className="text-2xl font-black text-slate-800">{analysis.passRate}%</Text>
                          <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pass Rate</Text>
                        </CardContent>
                      </Card>
                    </View>

                    {/* Progress Bar simulator for Pass Rate */}
                    <Card className="bg-white border-slate-100 shadow-sm p-4">
                      <CardContent>
                        <View className="flex-row justify-between items-center mb-1.5">
                          <Text className="text-xs font-bold text-slate-600">Cohort Pass Rate Indicator (Score &gt;= 40%)</Text>
                          <Text className="text-xs font-black text-indigo-600">{analysis.passRate}%</Text>
                        </View>
                        <View className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
                          <View 
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${analysis.passRate}%` }}
                          />
                        </View>
                      </CardContent>
                    </Card>

                    {/* Performance Breakdown details */}
                    <Card className="bg-white border-slate-100 shadow-sm overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        <Text className="text-xs font-extrabold text-slate-700 border-b border-slate-50 pb-2 mb-1">Detailed Cohort Statistics</Text>
                        <View className="flex-row justify-between">
                          <Text className="text-xs text-slate-500">Graded Students</Text>
                          <Text className="text-xs font-extrabold text-slate-800">{analysis.total}</Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-xs text-slate-500">Highest Score Achieved</Text>
                          <Text className="text-xs font-extrabold text-slate-800">{analysis.highest}%</Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-xs text-slate-500">Lowest Score Achieved</Text>
                          <Text className="text-xs font-extrabold text-slate-800">{analysis.lowest}%</Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-xs text-slate-500">Assessment Average</Text>
                          <Text className="text-xs font-extrabold text-slate-800">{analysis.average}%</Text>
                        </View>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <View className="py-20 items-center justify-center">
                    <TrendingUp size={48} color="#cbd5e1" />
                    <Text className="text-slate-400 font-bold mt-4">No Analysis Data</Text>
                    <Text className="text-slate-400 text-[10px] mt-1 text-center">Roster is empty or scores haven't been entered yet.</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
