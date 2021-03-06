import * as React from 'react';
import { DragLayerCollector, DndOptions, DndComponentClass } from './interfaces';
export default function DragLayer<Props, CollectedProps = {}>(collect: DragLayerCollector<Props, CollectedProps>, options?: DndOptions<Props>): <TargetClass extends React.ComponentClass<Props> | React.StatelessComponent<Props>>(DecoratedComponent: TargetClass) => TargetClass & DndComponentClass<Props>;
