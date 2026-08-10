import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  RiDashboardLine,
  RiDashboardFill,
  RiCalendarEventLine,
  RiCalendarEventFill,
  RiUser3Line,
  RiUser3Fill,
  RiFileTextLine,
  RiFileTextFill,
  RiTimerLine,
  RiTimerFill
} from 'react-icons/ri';

export const BottomNavigation = () => {
  const navItems = [
    {
      to: '/',
      label: 'Chấm công',
      iconOutline: RiDashboardLine,
      iconFill: RiDashboardFill,
    },
    {
      to: '/assignments',
      label: 'Phân công',
      iconOutline: RiCalendarEventLine,
      iconFill: RiCalendarEventFill,
    },

    {
      to: '/leave',
      label: 'Nghỉ phép',
      iconOutline: RiFileTextLine,
      iconFill: RiFileTextFill,
    },
    {
      to: '/ot',
      label: 'Tăng ca',
      iconOutline: RiTimerLine,
      iconFill: RiTimerFill,
    },
    {
      to: '/profile',
      label: 'Cá nhân',
      iconOutline: RiUser3Line,
      iconFill: RiUser3Fill,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 z-40 w-full px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.04)] safe-padding-bottom"
      style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E5E7EB' }}
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-1.5 rounded-2xl transition-all duration-200 ${isActive
              ? 'font-bold scale-105'
              : 'font-medium'
            }`
          }
        >
          {({ isActive }) => {
            const Icon = isActive ? item.iconFill : item.iconOutline;
            return (
              <>
                <div
                  className={`p-1.5 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-green-100 text-green-600' : 'bg-transparent text-gray-500'
                    }`}
                >
                  <Icon className="text-xl transition-transform duration-200" />
                </div>
                <span
                  className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'text-green-600 font-bold' : 'text-gray-500 font-medium'
                    }`}
                >
                  {item.label}
                </span>
              </>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNavigation;

