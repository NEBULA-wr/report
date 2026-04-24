  export type OffenseType = 'Leve' | 'Grave' | 'Muy Grave';

  export interface Report {
    id?: string;
    student_name: string;
    course: string;
    student_id: string;
    reason: string;
    offense_type: OffenseType;
    agreement: string;
    report_date: string;
    director_signature_url?: string;
    psychologist_signature_url?: string;
    student_signature_url?: string;
    evidence_image_url?: string;
    teacher_name?: string;
    created_at?: string;
  }

  export const GRADES = ['3ro', '4to', '5to', '6to'];
  export const SECTIONS = ['A', 'B', 'C', 'D'];

  export const COURSES = GRADES.flatMap(g => SECTIONS.map(s => `${g} ${s}`));

  export interface SystemUser {
    username: string;
    display_name: string;
  }
