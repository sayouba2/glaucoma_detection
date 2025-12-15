import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_large, MobileNet_V3_Large_Weights
import torch.nn.functional as F
import numpy as np

# --- 1. ARCHITECTURE DU MODÈLE (Copié de votre code) ---

class SpatialSoftAttention(nn.Module):
    def __init__(self, in_channels):
        super(SpatialSoftAttention, self).__init__()
        self.max_pool = nn.MaxPool2d(kernel_size=1, stride=1)
        self.avg_pool = nn.AvgPool2d(kernel_size=1, stride=1)
        self.attn_conv = nn.Conv2d(in_channels * 2, in_channels, kernel_size=1, stride=1)
    
    def forward(self, x):
        maxp_x = self.max_pool(x)
        avgp_x = self.avg_pool(x)
        spat_attn = self.attn_conv(torch.cat([maxp_x, avgp_x], dim=1))
        spat_attn = torch.sigmoid(spat_attn)
        return torch.mul(spat_attn, x)

def build_mobilenetv3_model(num_classes=2):
    model = mobilenet_v3_large(weights=MobileNet_V3_Large_Weights.DEFAULT)
    
    for param in model.parameters():
        param.requires_grad = False
    for param in model.features[-5:].parameters():  
        param.requires_grad = True

    in_channels = model.features[-1][0].out_channels 
    modules = list(model.features)  
    modules.append(SpatialSoftAttention(in_channels)) 
    modules.append(nn.AdaptiveAvgPool2d((1, 1)))  

    classifier_head = nn.Sequential(
        nn.Flatten(),
        nn.Linear(in_channels, 1024), nn.ReLU(),
        nn.Dropout(0.6),
        nn.Linear(1024, 512), nn.ReLU(),
        nn.Dropout(0.4),
        nn.Linear(512, num_classes)
    )
    
    modified_model = nn.Sequential(
        nn.Sequential(*modules),  
        classifier_head            
    )
    
    return modified_model

def load_model_weights(model_path, device='cpu'):
    """Charge le modèle et les poids"""
    model = build_mobilenetv3_model(num_classes=2)
    # map_location assure que ça charge sur CPU même si entraîné sur GPU
    best_model_state = torch.load(model_path, map_location=device)
    model.load_state_dict(best_model_state)
    model.to(device)
    model.eval()
    return model

# --- 2. LOGIQUE GRADCAM (Copié et nettoyé) ---

class GradCAM:
    def __init__(self, model):
        self.model = model
        self.feature_extractor = model[0]  
        self.target_layer = self.feature_extractor[-3]
        self.gradients = None
        self.activations = None
        self.target_layer.register_forward_hook(self.save_activation)
        self.target_layer.register_full_backward_hook(self.save_gradient)
    
    def save_activation(self, module, input, output):
        self.activations = output
    
    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]
    
    def __call__(self, x, class_idx=None):
        self.model.eval()
        output = self.model(x)
        if class_idx is None:
            class_idx = output.argmax(dim=1)
        self.model.zero_grad()
        one_hot = torch.zeros_like(output)
        one_hot[0][class_idx] = 1
        output.backward(gradient=one_hot, retain_graph=True)
        weights = torch.mean(self.gradients, dim=(2, 3))
        cam = torch.sum(weights[:, :, None, None] * self.activations, dim=1)
        cam = F.relu(cam)
        cam = cam - torch.min(cam)
        cam = cam / (torch.max(cam) + 1e-7)
        return cam.detach().cpu().numpy()

class GradCAMPlusPlus:
    def __init__(self, model):
        self.model = model
        self.feature_extractor = model[0]
        self.target_layer = self.feature_extractor[-3] 
        self.gradients = None
        self.activations = None
        self.target_layer.register_forward_hook(self.save_activation)
        self.target_layer.register_full_backward_hook(self.save_gradient)
    
    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]
    
    def save_activation(self, module, input, output):
        self.activations = output
    
    def __call__(self, x, class_idx=None):
        self.model.eval()
        output = self.model(x)
        if class_idx is None:
            class_idx = output.argmax(dim=1)
        self.model.zero_grad()
        one_hot = torch.zeros_like(output)
        one_hot[0][class_idx] = 1
        output.backward(gradient=one_hot, retain_graph=True)
        grad = self.gradients[0]
        activation = self.activations[0]
        alpha_num = grad.pow(2)
        alpha_denom = 2.0 * grad.pow(2)
        alpha_denom += torch.sum(activation * grad.pow(3), dim=(1, 2), keepdim=True)
        alpha = alpha_num / (alpha_denom + 1e-7)
        weights = torch.sum(alpha * F.relu(grad), dim=(1, 2))
        cam = torch.sum(weights[:, None, None] * activation, dim=0)
        cam = F.relu(cam)
        cam = cam - torch.min(cam)
        cam = cam / (torch.max(cam) + 1e-7)
        return cam.detach().cpu().numpy()