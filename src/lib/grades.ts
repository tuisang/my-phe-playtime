// Grade system: PP1=-1, PP2=0, Grades 1-12

export interface GradeCategory {
  name: string;
  grades: number[];
  gradient: string;
  borderColor: string;
  bgColor: string;
}

export const GRADE_CATEGORIES: GradeCategory[] = [
  {
    name: "Kindergarten",
    grades: [-1, 0],
    gradient: "from-pink-400 to-rose-500",
    borderColor: "border-pink-400",
    bgColor: "bg-pink-50",
  },
  {
    name: "Lower Primary",
    grades: [1, 2, 3],
    gradient: "from-yellow-400 to-orange-500",
    borderColor: "border-orange-400",
    bgColor: "bg-orange-50",
  },
  {
    name: "Upper Primary",
    grades: [4, 5, 6],
    gradient: "from-cyan-400 to-teal-500",
    borderColor: "border-teal-400",
    bgColor: "bg-teal-50",
  },
  {
    name: "Junior High School",
    grades: [7, 8, 9],
    gradient: "from-purple-400 to-indigo-500",
    borderColor: "border-purple-400",
    bgColor: "bg-purple-50",
  },
  {
    name: "Senior High School",
    grades: [10, 11, 12],
    gradient: "from-emerald-400 to-green-600",
    borderColor: "border-emerald-400",
    bgColor: "bg-emerald-50",
  },
];

export const ALL_GRADES: number[] = GRADE_CATEGORIES.flatMap((c) => c.grades);

export const getGradeLabel = (grade: number): string => {
  if (grade === -1) return "PP1";
  if (grade === 0) return "PP2";
  return `Grade ${grade}`;
};

export const getGradeShortLabel = (grade: number): string => {
  if (grade === -1) return "PP1";
  if (grade === 0) return "PP2";
  return `${grade}`;
};

export const getCategoryForGrade = (grade: number): GradeCategory => {
  return (
    GRADE_CATEGORIES.find((c) => c.grades.includes(grade)) ??
    GRADE_CATEGORIES[1]
  );
};
