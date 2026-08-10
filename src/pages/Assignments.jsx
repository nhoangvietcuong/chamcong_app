import React, { useEffect, useState } from 'react';
import { useAssignment } from '../hooks/useAssignment';
import dayjs from 'dayjs';
import {
  RiCalendarEventLine,
  RiMapPinLine,
  RiInformationLine,
  RiCloseLine,
  RiRadarLine
} from 'react-icons/ri';

export const Assignments = () => {
  const {
    todayAssignment,
    upcomingAssignments,
    completedAssignments,
    isLoading,
    fetchTodayAssignment,
    fetchUpcomingAndCompleted
  } = useAssignment();

  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming' | 'completed'
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    fetchTodayAssignment();
    fetchUpcomingAndCompleted();
  }, [fetchTodayAssignment, fetchUpcomingAndCompleted]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
            Assigned (Đã Phân Công)
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
            Completed (Đã Hoàn Thành)
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#EF4444] border border-red-200">
            Đã Hủy
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-[#6B7280] border border-[#E5E7EB]">
            Quá Hạn
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-[#6B7280]">
            {status}
          </span>
        );
    }
  };

  const renderAssignmentCard = (assignment) => {
    if (!assignment) return null;
    return (
      <div
        key={assignment.assignmentId}
        onClick={() => setSelectedAssignment(assignment)}
        className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-5 hover:border-[#22C55E]/40 transition-all cursor-pointer space-y-3 active:scale-[0.99] shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#22C55E] text-xs font-bold">
            <RiCalendarEventLine className="text-[#22C55E]" />
            <span>{dayjs(assignment.workDate).format('DD/MM/YYYY')}</span>
          </div>
          {getStatusBadge(assignment.status)}
        </div>

        <div className="mt-3">
          {assignment.allowedLocations && assignment.allowedLocations.length > 0 ? (
            <div className="space-y-3">
              {assignment.allowedLocations.map((loc, idx) => (
                <div key={idx} className="flex gap-3.5 items-start p-4 rounded-2xl border bg-[#F9FAFB] border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-left">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                    <RiMapPinLine className="text-base" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-xs font-black text-slate-800 leading-snug">
                      {loc.locationName || loc.location_name}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      {loc.address}
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]">
                        <RiRadarLine className="text-[10px]" />
                        BK: {loc.allowedRadiusMeter || loc.allowed_radius_meter}m
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3.5 items-start p-4 rounded-2xl border bg-[#F9FAFB] border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-left">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <RiMapPinLine className="text-base" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-xs font-black text-slate-800 leading-snug">
                  {assignment.location?.locationName}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                  {assignment.location?.address}
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]">
                    <RiRadarLine className="text-[10px]" />
                    BK: {assignment.location?.allowedRadiusMeter}m
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
         {/* <span className="text-[#22C55E] flex items-center gap-1 font-bold text-xs">
            Chi tiết <RiInformationLine className="text-sm" />
          </span> */}
        </div>
      </div>
    );
  };

  const getActiveList = () => {
    switch (activeTab) {
      case 'today':
        return todayAssignment ? [todayAssignment] : [];
      case 'upcoming':
        return upcomingAssignments;
      case 'completed':
        return completedAssignments;
      default:
        return [];
    }
  };

  const activeList = getActiveList();

  return (
    <div className="space-y-4 pb-24 min-h-screen text-[#111827] animate-fade-in" style={{ backgroundColor: '#F6F8FA' }}>
      {/* Title */}
      <div className="pt-1">
        <h1 className="text-xl font-extrabold text-[#111827]">Lịch Phân Công</h1>
        <p className="text-xs text-[#6B7280] font-medium mt-0.5">Quản lý và theo dõi các địa điểm làm việc</p>
      </div>

      {/* Tabs / Segmented Control */}
      <div className="flex p-1.5 rounded-[16px] gap-1" style={{ backgroundColor: '#EDEDED' }}>
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 min-h-[44px] px-1 py-1.5 text-center text-xs font-bold transition-all cursor-pointer flex items-center justify-center whitespace-normal leading-tight ${activeTab === 'today'
              ? 'bg-[#FFFFFF] text-[#22C55E] shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-[12px]'
              : 'text-[#6B7280] hover:text-[#111827] bg-transparent'
            }`}
        >
          Hôm nay
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 min-h-[44px] px-1 py-1.5 text-center text-xs font-bold transition-all cursor-pointer flex items-center justify-center whitespace-normal leading-tight ${activeTab === 'upcoming'
              ? 'bg-[#FFFFFF] text-[#22C55E] shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-[12px]'
              : 'text-[#6B7280] hover:text-[#111827] bg-transparent'
            }`}
        >
          Sắp tới ({upcomingAssignments.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 min-h-[44px] px-1 py-1.5 text-center text-xs font-bold transition-all cursor-pointer flex items-center justify-center whitespace-normal leading-tight ${activeTab === 'completed'
              ? 'bg-[#FFFFFF] text-[#22C55E] shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-[12px]'
              : 'text-[#6B7280] hover:text-[#111827] bg-transparent'
            }`}
        >
          Đã hoàn thành ({completedAssignments.length})
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-6 w-48 bg-gray-200 rounded"></div>
              <div className="h-4 w-full bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : activeList.length > 0 ? (
        <div className="space-y-3">
          {activeList.map(renderAssignmentCard)}

          {/* Dash Empty State for other assignments of the day */}
          {activeTab === 'today' && (
            <div className="border border-dashed border-[#E5E7EB] p-6 rounded-2xl text-center flex flex-col items-center justify-center bg-[#FFFFFF]/40">
              <div className="w-10 h-10 text-[#6B7280] mb-2 flex items-center justify-center bg-gray-100 rounded-full relative">
                <RiCalendarEventLine className="text-xl" />
                <span className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">X</span>
              </div>
              <p className="text-[#6B7280] text-xs font-medium">Không có nhiệm vụ nào khác trong ngày</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#FFFFFF] border border-dashed border-[#E5E7EB] p-8 rounded-2xl text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 text-[#6B7280] mb-3 flex items-center justify-center bg-gray-50 rounded-full relative">
            <RiCalendarEventLine className="text-2xl" />
            <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">X</span>
          </div>
          <p className="text-[#111827] text-sm font-bold">Không tìm thấy phân công nào</p>
          <p className="text-[#6B7280] text-xs mt-1 font-medium">Lịch làm việc sẽ được cập nhật bởi quản lý hoặc phòng nhân sự.</p>
        </div>
      )}

      {/* Detail Modal/Drawer */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-[#E5E7EB] rounded-[24px] w-full max-w-md p-6 relative max-h-[80vh] overflow-y-auto space-y-5 shadow-2xl text-[#111827] mb-8">
            {/* Close Button */}
            <button
              onClick={() => setSelectedAssignment(null)}
              className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-500 hover:text-gray-800 rounded-full focus:outline-none cursor-pointer"
            >
              <RiCloseLine className="text-xl" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                {getStatusBadge(selectedAssignment.status)}
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">Danh sách địa điểm phân công</h2>
              
              {selectedAssignment.allowedLocations && selectedAssignment.allowedLocations.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedAssignment.allowedLocations.map((loc, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200/50 p-3 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-gray-900">
                        <RiMapPinLine className="text-[#22C55E]" />
                        <span>{loc.locationName || loc.location_name}</span>
                      </div>
                      <div className="text-gray-500 leading-normal pl-5">
                        {loc.address}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-600 font-semibold pl-5 pt-0.5">
                        <span className="flex items-center gap-1">
                          <RiRadarLine className="text-[#22C55E]" />
                          Bán kính: {loc.allowedRadiusMeter || loc.allowed_radius_meter}m
                        </span>
                        <span className="font-mono">
                          GPS: {loc.latitude}, {loc.longitude}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200/50 p-3 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-gray-900">
                    <RiMapPinLine className="text-[#22C55E]" />
                    <span>{selectedAssignment.location?.locationName}</span>
                  </div>
                  <div className="text-gray-500 leading-normal pl-5">
                    {selectedAssignment.location?.address}
                  </div>
                  <div className="flex gap-4 text-[10px] text-gray-600 font-semibold pl-5 pt-0.5">
                    <span className="flex items-center gap-1">
                      <RiRadarLine className="text-[#22C55E]" />
                      Bán kính: {selectedAssignment.location?.allowedRadiusMeter}m
                    </span>
                    <span className="font-mono">
                      GPS: {selectedAssignment.location?.latitude}, {selectedAssignment.location?.longitude}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="bg-gray-50 p-4 rounded-[16px] space-y-3 text-xs border border-gray-100">
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Ngày làm việc</span>
                <span className="font-bold text-gray-800">{dayjs(selectedAssignment.workDate).format('DD/MM/YYYY')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Ca làm việc</span>
                <span className="font-bold text-gray-800">
                  {selectedAssignment.shift?.shiftName || 'Ca hành chính mặc định (HC)'}
                </span>
              </div>
            </div>

            {selectedAssignment.note && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-[16px] text-xs text-emerald-800">
                <span className="font-bold block mb-1">Ghi chú từ quản lý:</span>
                {selectedAssignment.note}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
