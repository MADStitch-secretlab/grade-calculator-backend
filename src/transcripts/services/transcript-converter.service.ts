import { Injectable, Logger } from '@nestjs/common';
import { TranscriptDataDto } from '../dto/transcript-data.dto';
import { SimulationInputDto } from '../../gpa/dto/simulation-input.dto';
import { SubjectDto } from '../dto/subject.dto';

/**
 * OCR 결과를 GPA 시뮬레이션 모델 입력 형식으로 변환하는 서비스
 */
@Injectable()
export class TranscriptConverterService {
  private readonly logger = new Logger(TranscriptConverterService.name);

  /**
   * 성적을 GPA 점수로 변환
   */
  private convertGradeToGradePoint(grade: string): number | null {
    const gradeMap: Record<string, number> = {
      'A+': 4.5,
      'A0': 4.0,
      'A-': 3.7,
      'B+': 3.5,
      'B0': 3.0,
      'B-': 2.7,
      'C+': 2.5,
      'C0': 2.0,
      'C-': 1.7,
      'D+': 1.5,
      'D0': 1.0,
      'D-': 0.7,
      'F': 0.0,
    };
    return gradeMap[grade] ?? null;
  }

  /**
   * 학기 문자열을 정규화 (예: "2019학년도 1학기" → "2019-1")
   */
  private normalizeSemester(semester: string): string {
    // "2019학년도 1학기" 형식을 "2019-1"로 변환
    const match = semester.match(/(\d{4})학년도\s*(\d)/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    // 이미 "2019-1" 형식인 경우
    if (semester.match(/^\d{4}-\d$/)) {
      return semester;
    }
    return semester;
  }

  /**
   * 학기 문자열에서 연도 추출
   */
  private extractYear(semester: string): number | null {
    const match = semester.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * 학기별로 과목 그룹화 및 통계 계산
   */
  private groupSubjectsBySemester(
    subjects: SubjectDto[],
  ): Map<string, { credits: number; totalGradePoints: number; count: number }> {
    const semesterMap = new Map<
      string,
      { credits: number; totalGradePoints: number; count: number }
    >();

    for (const subject of subjects) {
      const normalizedSemester = this.normalizeSemester(subject.semester);
      const gradePoint = this.convertGradeToGradePoint(subject.grade);

      if (!semesterMap.has(normalizedSemester)) {
        semesterMap.set(normalizedSemester, {
          credits: 0,
          totalGradePoints: 0,
          count: 0,
        });
      }

      const semesterData = semesterMap.get(normalizedSemester)!;
      semesterData.count += 1;

      // 학점이 포함된 성적만 계산 (P, NP, S, U 등은 제외)
      // 등급 점수가 있는 과목만 학점과 점수 모두 합산
      if (gradePoint !== null && subject.credits) {
        semesterData.credits += subject.credits;
        semesterData.totalGradePoints += gradePoint * subject.credits;
      }
    }

    return semesterMap;
  }

  /**
   * 학기를 정렬된 term_id로 변환 (S1, S2, S3...)
   */
  private semesterToTermId(
    semester: string,
    semesterOrder: Map<string, number>,
  ): string {
    const order = semesterOrder.get(semester) || 0;
    return `S${order + 1}`;
  }

  /**
   * OCR 결과를 GPA 시뮬레이션 입력 형식으로 변환
   */
  convertToSimulationInput(
    transcriptData: TranscriptDataDto,
    targetGpa: number,
    targetTotalCredits: number,
    scaleMax: number = 4.5,
    futureTerms?: Array<{ id: string; type: 'regular' | 'summer'; planned_credits: number; max_credits?: number }>,
  ): SimulationInputDto {
    this.logger.log('=== OCR 결과를 시뮬레이션 입력 형식으로 변환 시작 ===');

    // 1. 학기별로 과목 그룹화
    const semesterMap = this.groupSubjectsBySemester(
      transcriptData.subjects || [],
    );

    // 2. 학기를 연도순으로 정렬
    const sortedSemesters = Array.from(semesterMap.keys()).sort((a, b) => {
      const yearA = this.extractYear(a) || 0;
      const yearB = this.extractYear(b) || 0;
      if (yearA !== yearB) return yearA - yearB;
      // 같은 연도면 학기 번호로 정렬
      const semesterA = parseInt(a.split('-')[1] || '0', 10);
      const semesterB = parseInt(b.split('-')[1] || '0', 10);
      return semesterA - semesterB;
    });

    // 3. 학기 순서 매핑 생성
    const semesterOrder = new Map<string, number>();
    sortedSemesters.forEach((semester, index) => {
      semesterOrder.set(semester, index);
    });

    // 4. history 배열 생성 (과거 학기 이력)
    const history = sortedSemesters.map((semester) => {
      const data = semesterMap.get(semester)!;
      const termId = this.semesterToTermId(semester, semesterOrder);
      
      // 학기 평균 GPA 계산
      const achievedAvg =
        data.credits > 0 && data.totalGradePoints > 0
          ? data.totalGradePoints / data.credits
          : 0;

      return {
        term_id: termId,
        credits: data.credits,
        achieved_avg: Math.round(achievedAvg * 100) / 100, // 소수점 2자리
      };
    });

    // 5. future terms 생성 (사용자가 제공하지 않으면 기본값)
    const terms = futureTerms || this.generateDefaultFutureTerms(sortedSemesters.length);

    // 6. 최종 변환 결과
    const result: SimulationInputDto = {
      scale_max: scaleMax,
      G_t: targetGpa,
      C_tot: targetTotalCredits,
      history,
      terms,
    };

    this.logger.log('=== 변환 완료 ===');
    this.logger.log(`  과거 학기 수: ${history.length}`);
    this.logger.log(`  미래 학기 수: ${terms.length}`);
    this.logger.log(`  목표 GPA: ${targetGpa}`);
    this.logger.log(`  목표 총 학점: ${targetTotalCredits}`);

    return result;
  }

  /**
   * 기본 미래 학기 생성 (과거 학기 수에 따라)
   */
  private generateDefaultFutureTerms(
    pastSemesterCount: number,
  ): Array<{ id: string; type: 'regular' | 'summer'; planned_credits: number; max_credits?: number }> {
    const terms: Array<{ id: string; type: 'regular' | 'summer'; planned_credits: number; max_credits?: number }> = [];
    
    // 기본적으로 8학기까지 가정 (4년제)
    const totalSemesters = 8;
    const remainingSemesters = totalSemesters - pastSemesterCount;

    for (let i = 0; i < remainingSemesters; i++) {
      terms.push({
        id: `S${pastSemesterCount + i + 1}`,
        type: 'regular',
        planned_credits: 18, // 기본값
        max_credits: 21,
      });
    }

    return terms;
  }
}

