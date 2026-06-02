import { useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState } from '../store/store';

// Sử dụng hook này thay vì useSelector thuần để có gợi ý code (Intellisense)
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;