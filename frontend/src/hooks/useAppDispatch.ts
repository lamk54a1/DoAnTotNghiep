import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';

// Sử dụng hook này thay vì useDispatch thuần của react-redux
export const useAppDispatch = () => useDispatch<AppDispatch>();