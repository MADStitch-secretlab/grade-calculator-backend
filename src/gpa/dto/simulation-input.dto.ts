import {
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HistoryItemDto {
  @IsString()
  term_id: string;

  @IsNumber()
  @Min(0.1)
  credits: number;

  @IsNumber()
  @Min(0)
  achieved_avg: number;
}

export class TermItemDto {
  @IsString()
  id: string;

  @IsEnum(['regular', 'summer'])
  type: 'regular' | 'summer';

  @IsNumber()
  @Min(0.1)
  planned_credits: number;

  @IsNumber()
  @Min(0.1)
  @IsOptional()
  max_credits?: number;
}

export class SimulationInputDto {
  @IsNumber()
  @Min(0.1)
  scale_max: number;

  @IsNumber()
  @Min(0.1)
  @Max(5.0)
  G_t: number;

  @IsNumber()
  @Min(1)
  C_tot: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryItemDto)
  history: HistoryItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TermItemDto)
  terms: TermItemDto[];
}
