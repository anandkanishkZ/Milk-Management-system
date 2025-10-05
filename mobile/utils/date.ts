export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export const getDayName = (dayIndex: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex];
};

export const getTodayString = (): string => {
  return formatDate(new Date());
};

export const getWeekDayIndex = (date: Date | string): number => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getDay();
};

export const isDateToday = (dateStr: string): boolean => {
  return dateStr === getTodayString();
};

export const isDateInPast = (dateStr: string): boolean => {
  return dateStr <= getTodayString();
};

export const isDateInFuture = (dateStr: string): boolean => {
  return dateStr > getTodayString();
};
